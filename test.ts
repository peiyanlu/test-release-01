import { runGit } from '@peiyanlu/cli-utils'


export const getLatestTag = async (match = '*', exclude = '*-beta.*') => {
  return runGit([
    'describe',
    '--tags',
    '--abbrev=0',
    `--match=${ match }`,
    `--exclude=${ exclude }`,
  ])
}

export const getLatestTagFromAllRefs = async (match = '*') => {
  return runGit([
    '-c',
    'versionsort.suffix=-',
    'for-each-ref',
    '--count=1',
    '--sort=-v:refname',
    '--format=%(refname:short)',
    `refs/tags/${ match }`,
  ])
}

export const getPreviousTag = async (current?: string) => {
  const sha = await runGit([ 'rev-list', '--tags', current || '--skip=1', '--max-count=1' ])
  return runGit([ 'describe', '--tags', '--abbrev=0', `${ sha }^` ])
}

export const getFullHash = (short: string) => {
  return runGit([ 'rev-parse', short ])
}

export const resolveChangelogRange = async (isIncrement?: boolean) => {
  const latestTag = await getLatestTag()
  const previousTag = await getPreviousTag(latestTag)
  
  // 没有任何 tag 只能从 HEAD 往回
  if (!latestTag) {
    return { from: '', to: 'HEAD' }
  }
  
  // 版本不发生变化
  if (!isIncrement && previousTag) {
    return { from: previousTag, to: `${ latestTag }^1` }
  }
  
  // 正常 release
  return { from: latestTag, to: 'HEAD' }
}

export const getLog = async (from = '', to = 'HEAD', print = false) => {
  const format = print ? '* %s (%h)' : '%H%n%h%n%s%n%b%n==END=='
  const cmd = [ 'log', `--pretty=format:${ format }`, '--no-merges' ]
  
  if (from.trim()) cmd.push(`${ from.trim() }...${ to.trim() }`)
  
  return runGit(cmd, { trim: false })
}


export interface ParsedCommit {
  type: string
  scope?: string
  breaking: boolean
  description: string
  gitmoji?: string
  pr?: string
  breaks?: string
  issues?: Record<IssueLinkType, number[]>          // 👈 新增
  header?: string
  body?: string
  footer?: string
  shortHash: string
  fullHash: string
}

type IssueLinkType = 'fixes' | 'closes' | 'resolves' | 'related' | 'refs';


const extractNumbers = (text: string) => Array
  .from(text.matchAll(/#(\d+)/g))
  .map(m => Number(m[1]))

export const parseIssueFooters = (body: string) => {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
  
  const typeMatchers: Record<IssueLinkType, RegExp> = {
    fixes: /^Fixes/i,
    closes: /^Closes/i,
    resolves: /^Resolves/i,
    related: /^(Related to|Related)/i,
    refs: /^Refs?/i,
  }
  
  const res: Record<IssueLinkType, number[]> = {
    fixes: [],
    closes: [],
    resolves: [],
    related: [],
    refs: [],
  }
  
  for (const line of lines) {
    for (const [ type, regex ] of Object.entries(typeMatchers)) {
      if (regex.test(line)) {
        const nums = extractNumbers(line)
        nums.forEach(n => {
          res[type as IssueLinkType].push(n)
        })
      }
    }
  }
  
  return res
}


export const parseCommit = (
  header: string,
  body: string,
  footer: string,
  shortHash: string,
  fullHash: string,
): ParsedCommit | undefined => {
  // if (shouldIgnoreCommit(header)) return
  
  const regStr = `
    (?<type>\\w+)(?:\\((?<scope>[^)]+)\\))?(?<breaking>!)?:\\s*
    (?:(?<gitmoji>[\\u{1F300}-\\u{1FAFF}]))?\\s*
    (?<description>.+?)\\s*
    (?:\\(#(?<pr>\\d+)\\))?\\s*$
  `.replace(/\n\s+/g, '')
  const reg = new RegExp(regStr, 'u')
  
  const match = header.match(reg)
  if (!match?.groups) return
  
  // ======== 🔹 解析 Issues（标题 + footer） ========
  
  const issues = new Set<string>()
  // 1️⃣ 从标题里解析： feat: xxx (#123)
  if (match.groups.pr) {
    issues.add(match.groups.pr)
  }
  
  // 2️⃣ 从 footer 解析：Closes/Fixes/Resolves #123
  const issuePattern = /(closes|fixes|resolves)\s+#(\d+)/gi
  let m: RegExpExecArray | null
  while ((m = issuePattern.exec(footer)) !== null) {
    issues.add(m[2])
  }
  
  
  // ======== 🔹 解析 BREAKING CHANGE ========
  let breaks: string | undefined
  if (/BREAKING CHANGE:/i.test(footer)) {
    const fm = footer.match(/BREAKING CHANGE:\s*(.+)/i)
    breaks = fm?.[1]
  }
  
  return {
    type: match.groups.type,
    scope: match.groups.scope,
    breaking: !!match.groups.breaking || !!breaks,
    gitmoji: match.groups.gitmoji,
    description: match.groups.description.trim(),
    pr: match.groups.pr,
    breaks,
    issues: parseIssueFooters(footer),
    shortHash,
    fullHash,
    header,
    body,
    footer,
  }
}


const { from, to } = await resolveChangelogRange(true)
const rawLog = await getLog(from, to, false)
const commitsRaw = rawLog?.split('==END==').filter(Boolean) ?? []


const normalize = (s: string) => s.trim().replace(/\r\n/g, '\n')

const isFooterLine = (line: string) => {
  if (!line) return false
  
  return (
    // 1) BREAKING CHANGE
    /^BREAKING CHANGE:/.test(line) ||
    
    // 2) Token: value 例如: Refs: #123 / Reviewed-by: Z
    /^[A-Za-z-]+(-[A-Za-z]+)*:\s+.+/.test(line) ||
    
    // 3) Token #value 例如: Fixes #123 / Closes #456 / Refs #789
    /^[A-Za-z-]+\s+#\d+/.test(line)
  )
}

export const splitCommitBodyAndFooter = (raw: string) => {
  const message = normalize(raw)
  const lines = message.trim().split('\n')
  
  let footerStart = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    
    if (isFooterLine(line)) {
      footerStart = i
    } else if (footerStart !== -1 && line === '') {
      // footer 上方的空行，作为分界点
      break
    }
  }
  
  if (footerStart === -1) {
    return {
      body: lines.slice(0).join('\n').trim(),
      footer: '',
    }
  }
  
  return {
    body: lines.slice(0, footerStart).join('\n').trim(),
    footer: lines.slice(footerStart).join('\n').trim(),
  }
}


const commits = commitsRaw
  .map(raw => {
    const [ fullHash, shortHash, subject, ...bodyFooter ] = raw.trim().split('\n').filter(Boolean)
    const { body, footer } = splitCommitBodyAndFooter(bodyFooter.join('\n'))
    
    return parseCommit(subject, body, footer, shortHash, fullHash)
  })

console.log(commits)

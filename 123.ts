import { runGit } from '@peiyanlu/cli-utils'


export const getLog = async (from = '', to = 'HEAD', print = true) => {
  // const format = print ? '* %s (%h)' : '%s %h %H'
  const format = print ? '* %s (%h)' : '%H%n%h%n%s%n%b%n==END=='
  const cmd = [ 'log', `--pretty=format:${ format }` ]
  // const cmd = [ 'log', `$(git describe --tags --abbrev=0)..HEAD` ]
  
  // if (from) cmd.push(`${ from }...${ to }`)
  // cmd.push('--oneline')
  
  return runGit(cmd, { trim: false })
}

console.log(await getLog())

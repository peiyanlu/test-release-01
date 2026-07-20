import { runGit } from '@peiyanlu/cli-utils'
import { cp, readFile, rm, writeFile } from 'node:fs/promises'


export const getLog = async (from = '', to = 'HEAD') => {
  const cmd = [ 'log', `--pretty=format:* %s (%h)` ]
  // const cmd = [ 'log', `$(git describe --tags --abbrev=0)..HEAD` ]
  
  // if (from) cmd.push(`${ from }...${ to }`)
  // cmd.push('--oneline')
  
  return runGit(cmd, { trim: false })
}

// console.log(await getLog())


await cp('./js/', './temp/', {
  recursive: true,
  filter(src, dest) {
    console.log(src, dest)
    return true
  }
})

import { defineConfig } from '@peiyanlu/release'


export default defineConfig({
  hooks: {
    'after:bump': 'echo Version bumped',
    'before:publish': () => {
      console.log('echo before publish')
    },
  },
  git: {
    commit: true,
    tag: true,
    push: true,
    commitMessage: 'chore(release): ${version}',
    tagMessage: 'Release ${version}',
    tagName: '${version}',
  },
  npm: {
    publish: true,
  },
  github: {
    release: true,
    releaseName: 'Release ${version}',
    prerelease: false,
    draft: false,
    tokenRef: 'GITHUB_TOKEN',
  },
})

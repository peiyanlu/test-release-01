import { defineConfig } from '@peiyanlu/release'


export default defineConfig({
  hooks: {
    'after:bump': 'echo Version bumped',
    'before:publish': (log) => {
      log.message('echo before publish')
    },
  },
  toTag: (pkg, version) => version,
  git: {
    commit: true,
    tag: true,
    push: true,
    commitMessage: 'chore(release): ${tag}',
    tagMessage: 'Release ${tag}',
    requireCleanWorkingTree: false,
  },
  npm: {
    publish: true,
    cleanup: {
      packageJson: {
        ignoreFields: [ 'testfields.a' ],
        keepScripts: [ 'test' ],
      },
      readme: true,
      removeTempDir: false,
    },
  },
  github: {
    release: true,
    releaseName: 'Release ${tag}',
    prerelease: false,
    draft: false,
    tokenRef: 'GITHUB_TOKEN',
  },
})

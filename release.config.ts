import { defineConfig, GithubHosting, PnpmProject } from '@peiyanlu/release'


export default defineConfig({
  project: new PnpmProject({
    tagPrefix: '',
  }),
  hosting: new GithubHosting(),
  bump: {},
})

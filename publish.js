import { publishTagToNpm } from '@peiyanlu/release'


await publishTagToNpm({
  gitTag: '1.0.16',
  getPkgDir: () => '.',
  defaultPackage: 'test-release-01'
})

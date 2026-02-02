import { publishTagToNpm } from '@peiyanlu/release'


publishTagToNpm({
  gitTag: '1.0.16',
  getPkgDir: () => '.',
})

import { readFileSync } from 'fs'
import { resolve } from 'path'

global.loadFixture = (name: string): string => {
  return readFileSync(resolve('./fixtures', `${name}.txt`), 'utf-8')
}

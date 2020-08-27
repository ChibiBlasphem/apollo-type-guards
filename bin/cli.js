#!/usr/bin/env node

const yargs = require('yargs')
const glob = require('glob')
const { resolve, basename, dirname } = require('path')
const {
  promises: { writeFile: fsWriteFile, readFile, mkdir },
  exists: fsExists,
} = require('fs')
const { extractGraphQLTypes, generateGuards } = require('../lib/index')

const fileExists = filepath =>
  new Promise(resolve => {
    fsExists(filepath, resolve)
  })
const writeFile = async (filepath, contents) => {
  const parentFolder = resolve(process.cwd(), dirname(filepath))
  if (!(await fileExists(parentFolder))) {
    await mkdir(parentFolder, { recursive: true })
  }
  return await fsWriteFile(filepath, contents)
}

const argv = yargs
  .option('globDir', {
    description: 'The glob to folders you want to generate type guards from',
    type: 'string',
    required: true,
  })
  .help()
  .alias('help', 'h').argv

const { globDir } = argv

glob(globDir + `${globDir.endsWith('/') ? '' : '/'}*.ts`, (err, matches) => {
  if (err) {
    console.log(err)
  } else {
    const matchesPromises = matches.map(filepath => {
      const absoluteFilepath = resolve(process.cwd(), filepath)
      return new Promise((resolve, reject) => {
        readFile(absoluteFilepath, 'utf8').then(contents => {
          resolve({ filepath: filepath, contents })
        })
      })
    })
    Promise.all(matchesPromises)
      .then(filesContents => {
        const guards = []
        for (let i = 0, l = filesContents.length; i < l; ++i) {
          const { filepath, contents } = filesContents[i]
          const filename = basename(filepath, '.ts')
          const graphqlTypesInfos = extractGraphQLTypes(contents)
          if (graphqlTypesInfos.length === 0) {
            continue
          }
          guards.push({
            filepath,
            guards: generateGuards(filename, graphqlTypesInfos),
          })
        }
        return guards
      })
      .then(async guards => {
        return Promise.all(
          guards.map(({ filepath, guards }) => {
            const filename = basename(filepath, '.ts')
            const guardFilepath = resolve(dirname(filepath), 'guards', `${filename}.ts`)
            return writeFile(guardFilepath, guards, { flag: '' })
          })
        )
      })
      .then(result => {
        console.log('The operation is complete')
      })
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
  }
})

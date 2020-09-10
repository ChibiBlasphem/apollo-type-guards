#!/usr/bin/env node

const yargs = require('yargs')
const glob = require('glob')
const ora = require('ora')
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

const PRECOMMENT = `/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.`

const argv = yargs
  .option('globDir', {
    description: 'The glob to folders you want to generate type guards from',
    type: 'string',
    required: true,
  })
  .help()
  .alias('help', 'h').argv

const { globDir } = argv
let spinner

glob(globDir + `${globDir.endsWith('/') ? '' : '/'}*.ts`, (err, matches) => {
  if (err) {
    console.log(err)
  } else {
    let numberOfFileToParse = matches.length,
      doneParsing = 0

    spinner = ora(`Loading Apollo type files and parsing... 0/${numberOfFileToParse}`).start()
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
            numberOfFileToParse--
            continue
          }
          spinner.text = `Loading Apollo type files and parsing... ${++doneParsing}/${numberOfFileToParse}`
          guards.push({
            filepath,
            guards: generateGuards(filename, graphqlTypesInfos),
          })
        }
        return guards
      })
      .then(async guards => {
        const numberOfFileToWrite = guards.length
        let doneWriting = 0

        spinner.succeed(
          `Loading Apollo type files and parsing... ${doneParsing}/${numberOfFileToParse}`
        )
        spinner = ora(`Writing guard files... 0/${numberOfFileToWrite}`).start()
        return Promise.all(
          guards.map(async ({ filepath, guards }) => {
            const filename = basename(filepath, '.ts')
            const guardFilepath = resolve(dirname(filepath), 'guards', `${filename}.ts`)

            const contents = PRECOMMENT + '\n\n' + guards
            return writeFile(guardFilepath, contents, { flag: '' }).then(() => {
              spinner.text = `Writing guard files... ${++doneWriting}/${numberOfFileToWrite}`
            })
          })
        )
      })
      .then(result => {
        spinner.succeed('Writing guard files... Complete')
      })
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
  }
})

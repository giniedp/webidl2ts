#!/usr/bin/env node

import * as yargs from 'yargs'
import { parseIDL } from './parse-idl'
import { convertIDL } from './convert-idl'
import { printTs, printEmscriptenModule } from './print-ts'
import * as fs from 'fs'
import { fetchIDL } from './fetch-idl'
import { Options } from './types'
import { fixes } from './fixes'

async function main() {
  const argv = yargs
    .wrap(null)
    .scriptName('webidl2ts')
    .usage('Usage: $0 [options]')
    .example('$0 -i https://www.w3.org/TR/webxr/ -o webxr.d.ts', 'Generate from online documentation')
    .example('$0 -i https://www.khronos.org/registry/webgl/specs/latest/2.0/webgl2.idl -o webgl.d.ts', 'Generate from online idl file')
    .example('$0 -i ./my.idl -o my.d.ts', 'Generate local idl file')
    .example('$0 -i ./ammo.idl -o ammo.d.ts -m Ammo -e', 'Generate emscripten module')
    .example('$0 -i ./ammo.idl -o ammo.d.ts -m Ammo -e -a', 'Generate emscripten module with ambiend declaration')

    .help('h')
    .alias('h', 'help')

    .option('i', {
      describe: 'Input file or url',
      alias: 'in',
      demand: true
    })
    .option('o', {
      describe: 'Output file path',
      alias: 'out',
      default: 'index.d.ts',
    })
    .option('e', {
      describe: 'Enable Emscripten mode',
      alias: 'emscripten',
      default: false,
      boolean: true,
    })
    .option('a', {
      describe: 'Emit ambient declaration (emscripten mode)',
      alias: 'ambient',
      default: false,
      boolean: true
    })
    .option('m', {
      describe: 'Module name (emscripten mode)',
      alias: 'module',
      default: 'Module'
    })

    .argv

  const options: Options = {
    input: argv.i as string,
    output: argv.o,
    emscripten: argv.e,
    ambient: argv.a,
    module: argv.m
  }

  if (!options.input) {
    process.exit(1)
  }

  convert(options)
}

async function convert(options: Options) {
  const idlString = await fetchIDL(options.input);
  const idl = await parseIDL(idlString, {
    preprocess: (idl: string) => {
      if (options.emscripten) {
        idl = fixes.inheritance(idl)
        idl = fixes.array(idl)
      }
      return idl
    }
  })
  const ts = convertIDL(idl, options)

  let tsString: string = null
  if (options.emscripten) {
    tsString = printEmscriptenModule(options.module, ts, !options.ambient)
  } else {
    tsString = printTs(ts)
  }

  fs.writeFileSync(options.output, tsString);
}

main()

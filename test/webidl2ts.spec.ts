import fs from 'fs'
import assert from 'node:assert'
import { it, describe } from 'node:test'
import * as path from 'path'
import { convertIDL, parseIDL, printEmscriptenModule, printTs, Options, fetchIDL } from '../src'
import { fixes } from '../src/fixes'

describe('webidl2ts', () => {
  const testCases: { title: string; options: Options }[] = [
    {
      title: 'should work in default mode',
      options: {
        emscripten: false,
        defaultExport: false,
        module: 'Module',
        input: path.join(__dirname, 'test.idl'),
        output: path.join(__dirname, 'default.d.ts'),
      },
    },
    {
      title: 'should work in emscripten mode',
      options: {
        emscripten: true,
        defaultExport: false,
        module: 'Module',
        input: path.join(__dirname, 'test.idl'),
        output: path.join(__dirname, 'emscripten.d.ts'),
      },
    },
  ]

  testCases.forEach(({ title, options }) => {
    it(title, async () => {
      const idlString = await fetchIDL(options.input)
      const idl = await parseIDL(idlString, {
        preprocess: (idl: string) => {
          if (options.emscripten) {
            idl = fixes.inheritance(idl)
            idl = fixes.array(idl)
          }
          return idl
        },
      })
      const ts = convertIDL(idl, options)
      const actual = options.emscripten ? printEmscriptenModule(options.module, ts, options.defaultExport) : printTs(ts)
      const expected = fs.readFileSync(options.output).toString()
      assert.equal(actual, expected)
    })
  })
})

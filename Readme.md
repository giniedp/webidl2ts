# Web IDL to d.ts converter

This tool generates a `.d.ts` file based on a WebIDL input file.

# Installation

use npm or yarn to install from npmjs

```shell
npm install webidl2ts
```

or from github

```shell
npm install github:giniedp/webidl2ts
```

# Usage

```
Usage: webidl2ts [options]

Options:
  --version             Show version number  [boolean]
  -h, --help            Show help  [boolean]
  -i, --in              Input file or url  [required]
  -o, --out             Output file path  [required]
  -e, --emscripten      Enable Emscripten mode  [boolean] [default: false]
  -n, --name            Name of the module (emscripten mode)  [default: "Module"]
  -d, --default-export  Write default export (emscripten mode)  [boolean] [default: false]
```

## Definitions for browser libs

Generate type definitions from a local idl file:
```
webidl2ts -i my.idl -o index.d.ts
```

Use remote IDL files:
```
webidl2ts -i https://www.khronos.org/registry/webgl/specs/latest/2.0/webgl2.idl -o webgl.d.ts
```

Generate type definitions from online documentation:
```
webidl2ts -i https://www.w3.org/TR/webxr/ -o webxr.d.ts
```

## Definitions for emscripten modules

Use the `-e` option to enable emscripten mode

```
webidl2ts -e -i https://raw.githubusercontent.com/kripken/ammo.js/master/ammo.idl -o ammo.d.ts
```

# Usage in a project

This is an excerpt of a `package.json` with scripts to generate type definitions for the Ammojs project.

```json
{
  "scripts": {
    "generate": "yarn generate:module && yarn generate:ambient",
    "generate:module": "webidl2ts -i ./ammo.idl -n Ammo -ed -o ./builds/ammo.d.ts",
    "generate:ambient": "webidl2ts -i ./ammo.idl -n Ammo  -e -o ./builds/ammo-ambient.d.ts",
  },
  "devDependencies": {
    "webidl2ts": "github:giniedp/webidl2ts"
  }
}
```

And an excerpt of the project structure in this scenario would be

```
    ├── builds/               // build output folder
    │   ├── ammo.d.ts         // The generated d.ts file with a default export
    │   ├── ammo-ambient.d.ts // The generated d.ts file with ambient declarations only
    ├── ammo.idl              // The idl file
    ├── package.json          // The package file
```

# Output and mode differences

Without the emscripten mode the provided IDL file must be a valid WebIDL 2 file. Otherwise it can not be parsed an an error is thrown. The generated `d.ts` output is roughly the same as with [TSJS-lib-generator](https://github.com/microsoft/TSJS-lib-generator).

Emscripten IDL files are not valid WebIDL 2 files. With emscripten mode enabled (`-e`) the IDL files are preprocessed so they can be parsed with the `webidl2` parser.

1. Inheritance statements are fixed:

```diff
-interface btVector4 {
+interface btVector4: btVector3 {
};
-btVector4 implements btVector3;
```

2. Array types (e.g. `float[]`) are converted to `FrozenArray` (e.g. `FrozenArray<float>`)

Please file an issue if you need further adjustments

Some types are generated differently

|| `-e=true` | `-e=false` |
|---|---|---|
|interfaces| generated as classes | generated as interfaces and declared vars |
|attributes| generated with `get_` and `set_` prefix | generated as properties |

The generated d.ts output includes the following Module definition with `-e` enabled

```ts
declare function Module<T>(target?: T): Promise<T & typeof Module>;
declare module Module {
  function destroy(obj: any): void;
  function _malloc(size: number): number;
  function _free(ptr: number): void;
  const HEAP8: Int8Array;
  const HEAP16: Int16Array;
  const HEAP32: Int32Array;
  const HEAPU8: Uint8Array;
  const HEAPU16: Uint16Array;
  const HEAPU32: Uint32Array;
  const HEAPF32: Float32Array;
  const HEAPF32: Float64Array;
  // ... generated from IDL
}
```

The `-d` option adds a default export
```ts
export default Module;
```

# References

- https://github.com/kripken/ammo.js/issues/233
- https://github.com/microsoft/TSJS-lib-generator
- https://github.com/osman-turan/ammo.js-typings
- https://ts-ast-viewer.com

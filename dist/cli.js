#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var yargs = require("yargs");
var parse_idl_1 = require("./parse-idl");
var convert_idl_1 = require("./convert-idl");
var print_ts_1 = require("./print-ts");
var fs = require("fs");
var fetch_idl_1 = require("./fetch-idl");
var fixes_1 = require("./fixes");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var argv, options;
        return __generator(this, function (_a) {
            argv = yargs
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
                boolean: true
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
                .argv;
            options = {
                input: argv.i,
                output: argv.o,
                emscripten: argv.e,
                ambient: argv.a,
                module: argv.m
            };
            console.log(JSON.stringify(options));
            if (!options.input) {
                process.exit(1);
            }
            convert(options);
            return [2 /*return*/];
        });
    });
}
function convert(options) {
    return __awaiter(this, void 0, void 0, function () {
        var idlString, idl, ts, tsString;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('convert', options.input);
                    return [4 /*yield*/, fetch_idl_1.fetchIDL(options.input)];
                case 1:
                    idlString = _a.sent();
                    return [4 /*yield*/, parse_idl_1.parseIDL(idlString, {
                            preprocess: function (idl) {
                                if (options.emscripten) {
                                    idl = fixes_1.fixes.inheritance(idl);
                                    idl = fixes_1.fixes.array(idl);
                                }
                                return idl;
                            }
                        })];
                case 2:
                    idl = _a.sent();
                    ts = convert_idl_1.convertIDL(idl, options);
                    tsString = null;
                    if (options.emscripten) {
                        if (options.ambient) {
                            tsString = print_ts_1.printEmscriptenModule(options.module, ts);
                        }
                        else {
                            tsString = print_ts_1.printEmscriptenModuleAmbient(options.module, ts);
                        }
                    }
                    else {
                        tsString = print_ts_1.printTs(ts);
                    }
                    console.log('writing', options.output);
                    fs.writeFileSync(options.output, tsString);
                    return [2 /*return*/];
            }
        });
    });
}
main();

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printEmscriptenModule = exports.printTs = void 0;
var ts = __importStar(require("typescript"));
function printTs(nodes) {
    var file = ts.createSourceFile("index.d.ts", '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    var printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return nodes.map(function (it) { return printer.printNode(ts.EmitHint.Unspecified, it, file); }).join('\n');
}
exports.printTs = printTs;
function printEmscriptenModule(moduleName, nodes, defaultExport) {
    var result = [];
    if (defaultExport) {
        // adds default export
        //    export default Module;
        result.push(ts.factory.createExportAssignment(
        /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword)], 
        /* isExportEquals */ false, 
        /* expression     */ ts.factory.createIdentifier(moduleName)));
    }
    // adds module function
    //    declare function Module<T>(target?: T): Promise<T & typeof Module>;
    result.push(ts.factory.createFunctionDeclaration(
    /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* asteriskToken  */ undefined, 
    /* name           */ moduleName, 
    /* typeParameters */ [ts.factory.createTypeParameterDeclaration(undefined, 'T')], 
    /* parameters     */ [
        ts.factory.createParameterDeclaration([], undefined, 'target', ts.factory.createToken(ts.SyntaxKind.QuestionToken), ts.factory.createTypeReferenceNode('T', [])),
    ], 
    /* type           */ ts.factory.createTypeReferenceNode('Promise', [
        ts.factory.createIntersectionTypeNode([
            ts.factory.createTypeReferenceNode('T', []),
            ts.factory.createTypeQueryNode(ts.factory.createIdentifier(moduleName)),
        ]),
    ]), 
    /* body           */ undefined));
    // adds module declaration with all types
    //    export declare module Module {
    //      ...
    //    }
    result.push(ts.factory.createModuleDeclaration(
    /* modifiers  */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* name       */ ts.factory.createIdentifier(moduleName), 
    /* body       */ ts.factory.createModuleBlock(__spreadArray(__spreadArray([], emscriptenAdditions(), true), nodes, true))));
    return printTs(result);
}
exports.printEmscriptenModule = printEmscriptenModule;
function emscriptenAdditions() {
    var result = [];
    // adds emscripten specific types
    //
    //     function destroy(obj: any): void;
    result.push(ts.factory.createFunctionDeclaration(
    /* modifiers      */ [], 
    /* asteriskToken  */ undefined, 
    /* name           */ 'destroy', 
    /* typeParameters */ [], 
    /* parameters     */ [
        ts.factory.createParameterDeclaration([], undefined, 'obj', undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
    ], 
    /* type           */ ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), 
    /* body           */ undefined));
    // adds malloc function
    //
    //     function _malloc(size: number): number;
    result.push(ts.factory.createFunctionDeclaration(undefined, undefined, ts.factory.createIdentifier('_malloc'), undefined, [
        ts.factory.createParameterDeclaration(undefined, undefined, ts.factory.createIdentifier('size'), undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), undefined),
    ], ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), undefined));
    // adds free function
    //
    //     function _free(size: number): number;
    result.push(ts.factory.createFunctionDeclaration(undefined, undefined, ts.factory.createIdentifier('_free'), undefined, [
        ts.factory.createParameterDeclaration(undefined, undefined, ts.factory.createIdentifier('ptr'), undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), undefined),
    ], ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), undefined));
    // adds HEAP* properties
    var heaps = [
        ['HEAP8', Int8Array.name],
        ['HEAP16', Int16Array.name],
        ['HEAP32', Int32Array.name],
        ['HEAPU8', Uint8Array.name],
        ['HEAPU16', Uint16Array.name],
        ['HEAPU32', Uint32Array.name],
        ['HEAPF32', Float32Array.name],
        ['HEAPF64', Float64Array.name],
    ];
    for (var _i = 0, heaps_1 = heaps; _i < heaps_1.length; _i++) {
        var _a = heaps_1[_i], name_1 = _a[0], type = _a[1];
        result.push(ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
            ts.factory.createVariableDeclaration(ts.factory.createIdentifier(name_1), undefined, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), undefined), undefined),
        ], ts.NodeFlags.Const)));
    }
    return result;
}

"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printEmscriptenModule = exports.printTs = void 0;
var ts = require("typescript");
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
        result.push(ts.createExportAssignment(
        /* decorators     */ [], 
        /* modifiers      */ [ts.createModifier(ts.SyntaxKind.DefaultKeyword)], 
        /* isExportEquals */ false, 
        /* expression     */ ts.createIdentifier(moduleName)));
    }
    // adds module function
    //    declare function Module<T>(target?: T): Promise<T & typeof Module>;
    result.push(ts.createFunctionDeclaration(
    /* decorators     */ [], 
    /* modifiers      */ [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* asteriskToken  */ undefined, 
    /* name           */ moduleName, 
    /* typeParameters */ [ts.createTypeParameterDeclaration('T')], 
    /* parameters     */ [
        ts.createParameter([], [], undefined, 'target', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createTypeReferenceNode('T', [])),
    ], 
    /* type           */ ts.createTypeReferenceNode('Promise', [
        ts.createIntersectionTypeNode([ts.createTypeReferenceNode('T', []), ts.createTypeQueryNode(ts.createIdentifier(moduleName))]),
    ]), 
    /* body           */ undefined));
    // adds module declaration with all types
    //    export declare module Module {
    //      ...
    //    }
    result.push(ts.createModuleDeclaration(
    /* decorators */ [], 
    /* modifiers  */ [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* name       */ ts.createIdentifier(moduleName), 
    /* body       */ ts.createModuleBlock(__spreadArrays(emscriptenAdditions(), nodes))));
    return printTs(result);
}
exports.printEmscriptenModule = printEmscriptenModule;
function emscriptenAdditions() {
    var result = [];
    // adds emscripten specific types
    //
    //     function destroy(obj: any): void;
    result.push(ts.createFunctionDeclaration(
    /* decorators     */ [], 
    /* modifiers      */ [], 
    /* asteriskToken  */ undefined, 
    /* name           */ 'destroy', 
    /* typeParameters */ [], 
    /* parameters     */ [ts.createParameter([], [], undefined, 'obj', undefined, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))], 
    /* type           */ ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), 
    /* body           */ undefined));
    // adds malloc function
    //
    //     function _malloc(size: number): number;
    result.push(ts.createFunctionDeclaration(undefined, undefined, undefined, ts.createIdentifier('_malloc'), undefined, [
        ts.createParameter(undefined, undefined, undefined, ts.createIdentifier('size'), undefined, ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), undefined),
    ], ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), undefined));
    // adds free function
    //
    //     function _free(size: number): number;
    result.push(ts.createFunctionDeclaration(undefined, undefined, undefined, ts.createIdentifier('_free'), undefined, [
        ts.createParameter(undefined, undefined, undefined, ts.createIdentifier('ptr'), undefined, ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), undefined),
    ], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), undefined));
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
        result.push(ts.createVariableStatement(undefined, ts.createVariableDeclarationList([
            ts.createVariableDeclaration(ts.createIdentifier(name_1), ts.createTypeReferenceNode(ts.createIdentifier(type), undefined), undefined),
        ], ts.NodeFlags.Const)));
    }
    return result;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function printTs(nodes) {
    var file = ts.createSourceFile("index.d.ts", '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    var printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, });
    return nodes.map(function (it) { return printer.printNode(ts.EmitHint.Unspecified, it, file); }).join('\n');
}
exports.printTs = printTs;
function printEmscriptenModule(moduleName, nodes) {
    // export default Ammo;
    var moduleAlias = ts.createExportAssignment(
    /* decorators     */ [], 
    /* modifiers      */ [ts.createModifier(ts.SyntaxKind.DefaultKeyword)], 
    /* isExportEquals */ false, 
    /* expression     */ ts.createIdentifier(moduleName));
    // export function Ammo<T>(ns?: T): Promise<T & typeof Ammo>;
    var moduleExport = ts.createFunctionDeclaration(
    /* decorators     */ [], 
    /* modifiers      */ [ts.createModifier(ts.SyntaxKind.ExportKeyword)], 
    /* asteriskToken  */ undefined, 
    /* name           */ moduleName, 
    /* typeParameters */ [ts.createTypeParameterDeclaration('T')], 
    /* parameters     */ [ts.createParameter([], [], undefined, 'target', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createTypeReferenceNode('T', []))], 
    /* type           */ ts.createTypeReferenceNode('Promise', [ts.createIntersectionTypeNode([ts.createTypeReferenceNode('T', []), ts.createTypeQueryNode(ts.createIdentifier(moduleName))])]), 
    /* body           */ undefined);
    // export declare module Ammo {
    var module = ts.createModuleDeclaration(
    /* decorators */ [], 
    /* modifiers  */ [ts.createModifier(ts.SyntaxKind.ExportKeyword), ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* name       */ ts.createIdentifier(moduleName), 
    /* body       */ ts.createModuleBlock(nodes));
    return printTs([
        moduleAlias,
        moduleExport,
        module,
    ]);
}
exports.printEmscriptenModule = printEmscriptenModule;
function printEmscriptenModuleAmbient(moduleName, nodes) {
    // declare function Ammo<T>(ns?: T): Promise<T & typeof Ammo>;
    var moduleLoader = ts.createFunctionDeclaration(
    /* decorators     */ [], 
    /* modifiers      */ [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* asteriskToken  */ undefined, 
    /* name           */ moduleName, 
    /* typeParameters */ [ts.createTypeParameterDeclaration('T')], 
    /* parameters     */ [ts.createParameter([], [], undefined, 'target', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createTypeReferenceNode('T', []))], 
    /* type           */ ts.createTypeReferenceNode('Promise', [ts.createIntersectionTypeNode([ts.createTypeReferenceNode('T', []), ts.createTypeQueryNode(ts.createIdentifier(moduleName))])]), 
    /* body           */ undefined);
    // declare module Ammo { ... }
    var module = ts.createModuleDeclaration(
    /* decorators */ [], 
    /* modifiers  */ [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* name       */ ts.createIdentifier(moduleName), 
    /* body       */ ts.createModuleBlock(nodes));
    return printTs([
        moduleLoader,
        module,
    ]);
}
exports.printEmscriptenModuleAmbient = printEmscriptenModuleAmbient;

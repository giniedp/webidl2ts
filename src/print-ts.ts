import * as ts from 'typescript'

export function printTs(nodes: ts.Statement[]) {
  const file = ts.createSourceFile(`index.d.ts`, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, })
  return nodes.map((it) => printer.printNode(ts.EmitHint.Unspecified, it, file)).join('\n')
}

export function printEmscriptenModule(moduleName: string, nodes: ts.Statement[], defaultExport: boolean): string {

  const result: ts.Statement[] = []
  if (defaultExport) {
    // adds default export
    //    export default Module;
    result.push(
      ts.createExportAssignment(
        /* decorators     */[],
        /* modifiers      */[ts.createModifier(ts.SyntaxKind.DefaultKeyword)],
        /* isExportEquals */ false,
        /* expression     */ ts.createIdentifier(moduleName),
      )
    )
  }

  // adds module function
  //    declare function Module<T>(target?: T): Promise<T & typeof Module>;
  result.push(
    ts.createFunctionDeclaration(
      /* decorators     */[],
      /* modifiers      */[ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      /* asteriskToken  */ undefined,
      /* name           */ moduleName,
      /* typeParameters */[ts.createTypeParameterDeclaration('T')],
      /* parameters     */[ts.createParameter([], [], undefined, 'target', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createTypeReferenceNode('T', []))],
      /* type           */ ts.createTypeReferenceNode('Promise', [ts.createIntersectionTypeNode([ts.createTypeReferenceNode('T', []), ts.createTypeQueryNode(ts.createIdentifier(moduleName))])]),
      /* body           */ undefined
    )
  )

  // adds module declaration with all types
  //    export declare module Module {
  //      ...
  //    }
  result.push(
    ts.createModuleDeclaration(
      /* decorators */[],
      /* modifiers  */[ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      /* name       */ ts.createIdentifier(moduleName),
      /* body       */ ts.createModuleBlock([
        ...emscriptenAdditions(),
        ...nodes,
      ])
    )
  )

  return printTs(result)
}

function emscriptenAdditions() {
  const result: ts.Statement[] = []

  // adds emscripten specific types
  //
  //     function destroy(obj: any): void;
  result.push(
    ts.createFunctionDeclaration(
      /* decorators     */[],
      /* modifiers      */[],
      /* asteriskToken  */ undefined,
      /* name           */ 'destroy',
      /* typeParameters */[],
      /* parameters     */[ts.createParameter([], [], undefined, 'obj', undefined, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword))],
      /* type           */ ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      /* body           */ undefined
    )
  )

  // adds malloc function
  //
  //     function _malloc(size: number): number;
  result.push(
    ts.createFunctionDeclaration(
      undefined,
      undefined,
      undefined,
      ts.createIdentifier("_malloc"),
      undefined,
      [ts.createParameter(
        undefined,
        undefined,
        undefined,
        ts.createIdentifier("size"),
        undefined,
        ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        undefined
      )],
      ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
      undefined
    )
  )

  // adds free function
  //
  //     function _free(size: number): number;
  result.push(
    ts.createFunctionDeclaration(
      undefined,
      undefined,
      undefined,
      ts.createIdentifier("_free"),
      undefined,
      [ts.createParameter(
        undefined,
        undefined,
        undefined,
        ts.createIdentifier("ptr"),
        undefined,
        ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        undefined
      )],
      ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      undefined
    )
  )
  // adds HEAP* properties
  const heaps = [
    ['HEAP8', Int8Array.name],
    ['HEAP16', Int16Array.name],
    ['HEAP32', Int32Array.name],
    ['HEAPU8', Uint8Array.name],
    ['HEAPU16', Uint16Array.name],
    ['HEAPU32', Uint32Array.name],
    ['HEAPF32', Float32Array.name],
    ['HEAPF32', Float64Array.name],
  ]
  for (const [name, type] of heaps) {
    result.push(
      ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(
          [ts.createVariableDeclaration(
            ts.createIdentifier(name),
            ts.createTypeReferenceNode(
              ts.createIdentifier(type),
              undefined
            ),
            undefined
          )],
          ts.NodeFlags.Const
        )
      ),
    )
  }
  return result
}

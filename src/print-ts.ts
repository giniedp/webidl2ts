import * as ts from 'typescript'

export function printTs(nodes: ts.Statement[]): string {
  const file = ts.createSourceFile(`index.d.ts`, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  return nodes.map((it) => printer.printNode(ts.EmitHint.Unspecified, it, file)).join('\n')
}

export function printEmscriptenModule(moduleName: string, nodes: ts.Statement[], defaultExport: boolean): string {
  const result: ts.Statement[] = []
  if (defaultExport) {
    // adds default export
    //    export default Module;
    result.push(
      ts.factory.createExportAssignment(
        /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword)],
        /* isExportEquals */ false,
        /* expression     */ ts.factory.createIdentifier(moduleName),
      ),
    )
  }

  // adds module function
  //    declare function Module<T>(target?: T): Promise<T & typeof Module>;
  result.push(
    ts.factory.createFunctionDeclaration(
      /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
      /* asteriskToken  */ undefined,
      /* name           */ moduleName,
      /* typeParameters */ [ts.factory.createTypeParameterDeclaration(undefined, 'T')],
      /* parameters     */ [
        ts.factory.createParameterDeclaration(
          [],
          undefined,
          'target',
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          ts.factory.createTypeReferenceNode('T', []),
        ),
      ],
      /* type           */ ts.factory.createTypeReferenceNode('Promise', [
        ts.factory.createIntersectionTypeNode([
          ts.factory.createTypeReferenceNode('T', []),
          ts.factory.createTypeQueryNode(ts.factory.createIdentifier(moduleName)),
        ]),
      ]),
      /* body           */ undefined,
    ),
  )

  // adds module declaration with all types
  //    export declare module Module {
  //      ...
  //    }
  result.push(
    ts.factory.createModuleDeclaration(
      /* modifiers  */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
      /* name       */ ts.factory.createIdentifier(moduleName),
      /* body       */ ts.factory.createModuleBlock([...emscriptenAdditions(), ...nodes]),
    ),
  )

  return printTs(result)
}

function emscriptenAdditions() {
  const result: ts.Statement[] = []

  // adds emscripten specific types
  //
  //     function destroy(obj: any): void;
  result.push(
    ts.factory.createFunctionDeclaration(
      /* modifiers      */ [],
      /* asteriskToken  */ undefined,
      /* name           */ 'destroy',
      /* typeParameters */ [],
      /* parameters     */ [
        ts.factory.createParameterDeclaration([], undefined, 'obj', undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
      ],
      /* type           */ ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      /* body           */ undefined,
    ),
  )

  // adds malloc function
  //
  //     function _malloc(size: number): number;
  result.push(
    ts.factory.createFunctionDeclaration(
      undefined,
      undefined,
      ts.factory.createIdentifier('_malloc'),
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier('size'),
          undefined,
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
          undefined,
        ),
      ],
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
      undefined,
    ),
  )

  // adds free function
  //
  //     function _free(size: number): number;
  result.push(
    ts.factory.createFunctionDeclaration(
      undefined,
      undefined,
      ts.factory.createIdentifier('_free'),
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier('ptr'),
          undefined,
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
          undefined,
        ),
      ],
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      undefined,
    ),
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
    ['HEAPF64', Float64Array.name],
  ]
  for (const [name, type] of heaps) {
    result.push(
      ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(name),
              undefined,
              ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), undefined),
              undefined,
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    )
  }
  return result
}

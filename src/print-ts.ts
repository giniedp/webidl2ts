import * as ts from 'typescript'

export function printTs(nodes: ts.Statement[]) {
  const file = ts.createSourceFile(`index.d.ts`, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, })
  return nodes.map((it) => printer.printNode(ts.EmitHint.Unspecified, it, file)).join('\n')
}

export function printEmscriptenModule(moduleName: string, nodes: ts.Statement[], defaultExport: boolean): string {
  // function destroy(obj: any): void;
  nodes.unshift(
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

  const result: ts.Statement[] = []
  if (defaultExport) {
    // export default Ammo;
    result.push(
      ts.createExportAssignment(
        /* decorators     */[],
        /* modifiers      */[ts.createModifier(ts.SyntaxKind.DefaultKeyword)],
        /* isExportEquals */ false,
        /* expression     */ ts.createIdentifier(moduleName),
      )
    )
  }

  // export function Ammo<T>(ns?: T): Promise<T & typeof Ammo>;
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

  // export declare module Ammo {
  result.push(
    ts.createModuleDeclaration(
      /* decorators */[],
      /* modifiers  */[ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      /* name       */ ts.createIdentifier(moduleName),
      /* body       */ ts.createModuleBlock(nodes)
    )
  )

  return printTs(result)
}

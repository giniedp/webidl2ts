import { MethodDeclaration } from 'typescript'
import * as webidl2 from 'webidl2'
import * as ts from 'typescript'
import { Options } from './types'

const bufferSourceTypes = [
  'ArrayBuffer',
  'ArrayBufferView',
  'DataView',
  'Int8Array',
  'Uint8Array',
  'Int16Array',
  'Uint16Array',
  'Uint8ClampedArray',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
]
const integerTypes = ['byte', 'octet', 'short', 'unsigned short', 'long', 'unsigned long', 'long long', 'unsigned long long']
const stringTypes = ['ByteString', 'DOMString', 'USVString', 'CSSOMString']
const floatTypes = ['float', 'unrestricted float', 'double', 'unrestricted double']
const sameTypes = ['any', 'boolean', 'Date', 'Function', 'Promise', 'void']
const baseTypeConversionMap = new Map<string, string>([
  ...[...bufferSourceTypes].map((type) => [type, type] as [string, string]),
  ...[...integerTypes].map((type) => [type, 'number'] as [string, string]),
  ...[...floatTypes].map((type) => [type, 'number'] as [string, string]),
  ...[...stringTypes].map((type) => [type, 'string'] as [string, string]),
  ...[...sameTypes].map((type) => [type, type] as [string, string]),
  ['object', 'any'],
  ['sequence', 'Array'],
  ['record', 'Record'],
  ['FrozenArray', 'ReadonlyArray'],
  ['EventHandler', 'EventHandler'],
  ['VoidPtr', 'unknown'],
])

export function convertIDL(rootTypes: webidl2.IDLRootType[], options?: Options): ts.Statement[] {
  const nodes: ts.Statement[] = []
  for (const rootType of rootTypes) {
    switch (rootType.type) {
      case 'interface':
      case 'interface mixin':
      case 'dictionary':
        nodes.push(convertInterface(rootType, options))
        for (const attr of rootType.extAttrs) {
          if (attr.name === 'Exposed' && attr.rhs?.value === 'Window') {
            nodes.push(
              ts.factory.createVariableStatement(
                [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
                ts.factory.createVariableDeclarationList(
                  [
                    ts.factory.createVariableDeclaration(
                      ts.factory.createIdentifier(rootType.name),
                      undefined,
                      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(rootType.name), undefined),
                      undefined,
                    ),
                  ],
                  undefined,
                ),
              ),
            )
          }
        }
        break
      case 'includes':
        nodes.push(convertInterfaceIncludes(rootType))
        break
      case 'enum':
        nodes.push(convertEnum(rootType))
        break
      case 'callback':
        nodes.push(convertCallback(rootType))
        break
      case 'typedef':
        nodes.push(convertTypedef(rootType))
        break
      default:
        console.log(newUnsupportedError('Unsupported IDL type', rootType))
        break
    }
  }
  return nodes
}

function convertTypedef(idl: webidl2.TypedefType) {
  return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, convertType(idl.idlType))
}

function createIterableMethods(
  name: string,
  keyType: ts.TypeNode,
  valueType: ts.TypeNode,
  pair: boolean,
  async: boolean,
  declarations: true,
): ts.MethodDeclaration[]
function createIterableMethods(
  name: string,
  keyType: ts.TypeNode,
  valueType: ts.TypeNode,
  pair: boolean,
  async: boolean,
  declarations: false,
): ts.MethodSignature[]
function createIterableMethods(
  name: string,
  keyType: ts.TypeNode,
  valueType: ts.TypeNode,
  pair: boolean,
  async: boolean,
  declarations: boolean,
): ts.MethodDeclaration[] | ts.MethodSignature[] {
  const result = []

  const iteratorName = async ? '[Symbol.asyncIterator]' : '[Symbol.iterator]'
  const iteratorType = ts.factory.createExpressionWithTypeArguments(
    ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
    pair ? [ts.factory.createTupleTypeNode([keyType, valueType])] : [valueType],
  )
  result.push(
    declarations
      ? ts.factory.createMethodDeclaration(undefined, undefined, iteratorName, undefined, undefined, undefined, iteratorType, undefined)
      : ts.factory.createMethodSignature(undefined, iteratorName, undefined, undefined, undefined, iteratorType),
  )

  const entriesName = 'entries'
  const entriesType = ts.factory.createExpressionWithTypeArguments(
    ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
    [ts.factory.createTupleTypeNode([keyType, valueType])],
  )
  result.push(
    declarations
      ? ts.factory.createMethodDeclaration(undefined, undefined, entriesName, undefined, undefined, undefined, entriesType, undefined)
      : ts.factory.createMethodSignature(undefined, entriesName, undefined, undefined, undefined, entriesType),
  )

  const keysName = 'keys'
  const keysType = ts.factory.createExpressionWithTypeArguments(
    ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
    [keyType],
  )
  result.push(
    declarations
      ? ts.factory.createMethodDeclaration(undefined, undefined, keysName, undefined, undefined, undefined, keysType, undefined)
      : ts.factory.createMethodSignature(undefined, keysName, undefined, undefined, undefined, keysType),
  )

  const valuesName = 'values'
  const valuesType = ts.factory.createExpressionWithTypeArguments(
    ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
    [valueType],
  )
  result.push(
    declarations
      ? ts.factory.createMethodDeclaration(undefined, undefined, valuesName, undefined, undefined, undefined, valuesType, undefined)
      : ts.factory.createMethodSignature(undefined, valuesName, undefined, undefined, undefined, valuesType),
  )

  const forEachName = 'forEach'
  const forEachParameters = [
    ts.factory.createParameterDeclaration(
      [],
      undefined,
      'callbackfn',
      undefined,
      ts.factory.createFunctionTypeNode(
        [],
        [
          ts.factory.createParameterDeclaration([], undefined, 'value', undefined, valueType),
          ts.factory.createParameterDeclaration([], undefined, pair ? 'key' : 'index', undefined, keyType),
          ts.factory.createParameterDeclaration(
            [],
            undefined,
            pair ? 'iterable' : 'array',
            undefined,
            pair ? ts.factory.createTypeReferenceNode(name, []) : ts.factory.createArrayTypeNode(valueType),
          ),
        ],
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      ),
    ),
    ts.factory.createParameterDeclaration(
      [],
      undefined,
      'thisArg',
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
    ),
  ]
  const forEachType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)

  result.push(
    declarations
      ? ts.factory.createMethodDeclaration(
          undefined,
          undefined,
          forEachName,
          undefined,
          undefined,
          forEachParameters,
          forEachType,
          undefined,
        )
      : ts.factory.createMethodSignature(undefined, forEachName, undefined, undefined, forEachParameters, forEachType),
  )

  return result
}

function convertInterface(idl: webidl2.InterfaceType | webidl2.DictionaryType | webidl2.InterfaceMixinType, options?: Options) {
  const typeMembers: ts.TypeElement[] = []
  const classMembers: ts.ClassElement[] = []

  const inheritance = []
  if ('inheritance' in idl && idl.inheritance) {
    inheritance.push(ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.inheritance), undefined))
  }

  idl.members.forEach((member: webidl2.IDLInterfaceMemberType | webidl2.FieldType) => {
    switch (member.type) {
      case 'attribute':
        if (options?.emscripten) {
          classMembers.push(createAttributeGetter(member), createAttributeSetter(member), convertMemberAttribute(member, true))
        } else {
          typeMembers.push(convertMemberAttribute(member, false))
        }
        break
      case 'operation':
        if (options?.emscripten) {
          classMembers.push(member.name === idl.name ? convertMemberConstructor(member, true) : convertMemberOperation(member, true))
        } else {
          typeMembers.push(member.name === idl.name ? convertMemberConstructor(member, false) : convertMemberOperation(member, false))
        }
        break
      case 'constructor':
        if (options?.emscripten) {
          classMembers.push(convertMemberConstructor(member, true))
        } else {
          typeMembers.push(convertMemberConstructor(member, false))
        }
        break
      case 'field':
        if (options?.emscripten) {
          classMembers.push(convertMemberField(member, true))
        } else {
          typeMembers.push(convertMemberField(member, false))
        }
        break
      case 'const':
        if (options?.emscripten) {
          classMembers.push(convertMemberConst(member, true))
        } else {
          typeMembers.push(convertMemberConst(member, false))
        }
        break
      case 'iterable': {
        type Members = Array<webidl2.IDLInterfaceMemberType | webidl2.FieldType | webidl2.IDLInterfaceMixinMemberType>
        const indexedPropertyGetter = (idl.members as Members).find(
          (member): member is webidl2.OperationMemberType =>
            member.type === 'operation' && member.special === 'getter' && member.arguments[0].idlType.idlType === 'unsigned long',
        )

        if ((indexedPropertyGetter && member.idlType.length === 1) || member.idlType.length === 2) {
          const keyType = convertType(indexedPropertyGetter ? indexedPropertyGetter.arguments[0].idlType : member.idlType[0])
          const valueType = convertType(member.idlType[member.idlType.length - 1])
          const pairs = member.idlType.length === 2
          if (options?.emscripten) {
            classMembers.push(...createIterableMethods(idl.name, keyType, valueType, pairs, member.async, true))
          } else {
            typeMembers.push(...createIterableMethods(idl.name, keyType, valueType, pairs, member.async, false))
          }
        }
        break
      }
      default:
        console.log(newUnsupportedError('Unsupported IDL member', member))
        break
    }
  })

  const name = ts.factory.createIdentifier(idl.name)
  const heritageClauses = inheritance.length ? [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)] : undefined

  return options?.emscripten
    ? ts.factory.createClassDeclaration([], name, undefined, heritageClauses, classMembers)
    : ts.factory.createInterfaceDeclaration([], name, undefined, heritageClauses, typeMembers)
}

function convertInterfaceIncludes(idl: webidl2.IncludesType) {
  return ts.factory.createInterfaceDeclaration(
    [],
    ts.factory.createIdentifier(idl.target),
    undefined,
    [
      ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
        ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.includes), undefined),
      ]),
    ],
    [],
  )
}

function createAttributeGetter(value: webidl2.AttributeMemberType): MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    'get_' + value.name,
    undefined,
    [],
    [],
    convertType(value.idlType),
    undefined,
  )
}

function createAttributeSetter(value: webidl2.AttributeMemberType): MethodDeclaration {
  const parameter = ts.factory.createParameterDeclaration([], undefined, value.name, undefined, convertType(value.idlType))
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    'set_' + value.name,
    undefined,
    [],
    [parameter],
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
    undefined,
  )
}

function convertMemberOperation(idl: webidl2.OperationMemberType, declaration: true): ts.MethodDeclaration
function convertMemberOperation(idl: webidl2.OperationMemberType, declaration: false): ts.MethodSignature
function convertMemberOperation(idl: webidl2.OperationMemberType, declaration: boolean): ts.MethodSignature | ts.MethodDeclaration {
  const name = idl.name
  const args = idl.arguments.map(convertArgument)
  const type = convertType(idl.idlType)

  return declaration
    ? ts.factory.createMethodDeclaration(undefined, undefined, name, undefined, [], args, type, undefined)
    : ts.factory.createMethodSignature(undefined, name, undefined, [], args, type)
}

function convertMemberConstructor(idl: webidl2.ConstructorMemberType | webidl2.OperationMemberType, declaration: true): ts.MethodDeclaration
function convertMemberConstructor(
  idl: webidl2.ConstructorMemberType | webidl2.OperationMemberType,
  declaration: false,
): ts.ConstructSignatureDeclaration
function convertMemberConstructor(
  idl: webidl2.ConstructorMemberType | webidl2.OperationMemberType,
  declaration: boolean,
): ts.MethodDeclaration | ts.ConstructSignatureDeclaration {
  const args = idl.arguments.map(convertArgument)
  return declaration
    ? ts.factory.createMethodDeclaration(undefined, undefined, 'constructor', undefined, [], args, undefined, undefined)
    : ts.factory.createConstructSignature([], args, undefined)
}

function convertMemberField(idl: webidl2.FieldType, declaration: true): ts.PropertyDeclaration
function convertMemberField(idl: webidl2.FieldType, declaration: false): ts.PropertySignature
function convertMemberField(idl: webidl2.FieldType, declaration: boolean): ts.PropertyDeclaration | ts.PropertySignature {
  const name = ts.factory.createIdentifier(idl.name)
  const optional = !idl.required ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined
  const type = convertType(idl.idlType)
  return declaration
    ? ts.factory.createPropertyDeclaration(undefined, name, optional, type, undefined)
    : ts.factory.createPropertySignature(undefined, name, optional, type)
}

function convertMemberConst(idl: webidl2.ConstantMemberType, declaration: true): ts.PropertyDeclaration
function convertMemberConst(idl: webidl2.ConstantMemberType, declaration: false): ts.PropertySignature
function convertMemberConst(idl: webidl2.ConstantMemberType, declaration: boolean): ts.PropertyDeclaration | ts.PropertySignature {
  const modifiers = [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
  const name = ts.factory.createIdentifier(idl.name)
  const type = convertType(idl.idlType)
  return declaration
    ? ts.factory.createPropertyDeclaration(modifiers, name, undefined, type, undefined)
    : ts.factory.createPropertySignature(modifiers, name, undefined, type)
}

function convertMemberAttribute(idl: webidl2.AttributeMemberType, declaration: true): ts.PropertyDeclaration
function convertMemberAttribute(idl: webidl2.AttributeMemberType, declaration: false): ts.PropertySignature
function convertMemberAttribute(idl: webidl2.AttributeMemberType, declaration: boolean): ts.PropertyDeclaration | ts.PropertySignature {
  const modifiers = [idl.readonly ? ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword) : null].filter((it) => it != null)
  const name = ts.factory.createIdentifier(idl.name)
  const type = convertType(idl.idlType)

  return declaration
    ? ts.factory.createPropertyDeclaration(modifiers, name, undefined, type, undefined)
    : ts.factory.createPropertySignature(modifiers, name, undefined, type)
}

function convertArgument(idl: webidl2.Argument) {
  const optional = idl.optional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined
  return ts.factory.createParameterDeclaration([], undefined, idl.name, optional, convertType(idl.idlType))
}

function convertType(idl: webidl2.IDLTypeDescription): ts.TypeNode {
  if (typeof idl.idlType === 'string') {
    const type = baseTypeConversionMap.get(idl.idlType) || idl.idlType
    switch (type) {
      case 'number':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
      case 'string':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      case 'void':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
      default:
        return ts.factory.createTypeReferenceNode(type, [])
    }
  }
  if (idl.generic) {
    const type = baseTypeConversionMap.get(idl.generic) || idl.generic
    return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), idl.idlType.map(convertType))
  }
  if (idl.union) {
    return ts.factory.createUnionTypeNode(idl.idlType.map(convertType))
  }

  console.log(newUnsupportedError('Unsupported IDL type', idl))
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
}

function convertEnum(idl: webidl2.EnumType) {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(idl.name),
    undefined,
    ts.factory.createUnionTypeNode(idl.values.map((it) => ts.factory.createLiteralTypeNode(ts.createStringLiteral(it.value)))),
  )
}

function convertCallback(idl: webidl2.CallbackType) {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(idl.name),
    undefined,
    ts.factory.createFunctionTypeNode(undefined, idl.arguments.map(convertArgument), convertType(idl.idlType)),
  )
}

function newUnsupportedError(message: string, idl: unknown) {
  return new Error(`
  ${message}
  ${JSON.stringify(idl, null, 2)}

  Please file an issue at https://github.com/giniedp/webidl2ts and provide the used idl file or example.
`)
}

"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIDL = void 0;
var ts = require("typescript");
var bufferSourceTypes = [
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
];
var integerTypes = ['byte', 'octet', 'short', 'unsigned short', 'long', 'unsigned long', 'long long', 'unsigned long long'];
var stringTypes = ['ByteString', 'DOMString', 'USVString', 'CSSOMString'];
var floatTypes = ['float', 'unrestricted float', 'double', 'unrestricted double'];
var sameTypes = ['any', 'boolean', 'Date', 'Function', 'Promise', 'void'];
var baseTypeConversionMap = new Map(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], __spreadArray([], bufferSourceTypes).map(function (type) { return [type, type]; })), __spreadArray([], integerTypes).map(function (type) { return [type, 'number']; })), __spreadArray([], floatTypes).map(function (type) { return [type, 'number']; })), __spreadArray([], stringTypes).map(function (type) { return [type, 'string']; })), __spreadArray([], sameTypes).map(function (type) { return [type, type]; })), [
    ['object', 'any'],
    ['sequence', 'Array'],
    ['record', 'Record'],
    ['FrozenArray', 'ReadonlyArray'],
    ['EventHandler', 'EventHandler'],
    ['VoidPtr', 'unknown'],
]));
function convertIDL(rootTypes, options) {
    var _a;
    var nodes = [];
    for (var _i = 0, rootTypes_1 = rootTypes; _i < rootTypes_1.length; _i++) {
        var rootType = rootTypes_1[_i];
        switch (rootType.type) {
            case 'interface':
            case 'interface mixin':
            case 'dictionary':
                nodes.push(convertInterface(rootType, options));
                for (var _b = 0, _c = rootType.extAttrs; _b < _c.length; _b++) {
                    var attr = _c[_b];
                    if (attr.name === 'Exposed' && ((_a = attr.rhs) === null || _a === void 0 ? void 0 : _a.value) === 'Window') {
                        nodes.push(ts.createVariableStatement([ts.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.createVariableDeclarationList([
                            ts.createVariableDeclaration(ts.createIdentifier(rootType.name), ts.createTypeReferenceNode(ts.createIdentifier(rootType.name), undefined), undefined),
                        ], undefined)));
                    }
                }
                break;
            case 'includes':
                nodes.push(convertInterfaceIncludes(rootType));
                break;
            case 'enum':
                nodes.push(convertEnum(rootType));
                break;
            case 'callback':
                nodes.push(convertCallback(rootType));
                break;
            case 'typedef':
                nodes.push(convertTypedef(rootType));
                break;
            default:
                console.log(newUnsupportedError('Unsupported IDL type', rootType));
                break;
        }
    }
    return nodes;
}
exports.convertIDL = convertIDL;
function convertTypedef(idl) {
    return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(idl.name), undefined, convertType(idl.idlType));
}
function createIterableMethods(name, keyType, valueType, pair, async) {
    return [
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments(pair ? [ts.createTupleTypeNode([keyType, valueType])] : [valueType], ts.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), async ? '[Symbol.asyncIterator]' : '[Symbol.iterator]', undefined),
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments([ts.createTupleTypeNode([keyType, valueType])], ts.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), 'entries', undefined),
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments([keyType], ts.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), 'keys', undefined),
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments([valueType], ts.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), 'values', undefined),
        ts.createMethodSignature([], [
            ts.createParameter([], [], undefined, 'callbackfn', undefined, ts.createFunctionTypeNode([], [
                ts.createParameter([], [], undefined, 'value', undefined, valueType),
                ts.createParameter([], [], undefined, pair ? 'key' : 'index', undefined, keyType),
                ts.createParameter([], [], undefined, pair ? 'iterable' : 'array', undefined, pair ? ts.createTypeReferenceNode(name, []) : ts.createArrayTypeNode(valueType)),
            ], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword))),
            ts.createParameter([], [], undefined, 'thisArg', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
        ], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), 'forEach', undefined),
    ];
}
function convertInterface(idl, options) {
    var members = [];
    var inheritance = [];
    if ('inheritance' in idl && idl.inheritance) {
        inheritance.push(ts.createExpressionWithTypeArguments(undefined, ts.createIdentifier(idl.inheritance)));
    }
    idl.members.forEach(function (member) {
        switch (member.type) {
            case 'attribute':
                if (options === null || options === void 0 ? void 0 : options.emscripten) {
                    members.push(createAttributeGetter(member));
                    members.push(createAttributeSetter(member));
                }
                members.push(convertMemberAttribute(member));
                break;
            case 'operation':
                if (member.name === idl.name) {
                    members.push(convertMemberConstructor(member, options));
                }
                else {
                    members.push(convertMemberOperation(member));
                }
                break;
            case 'constructor':
                members.push(convertMemberConstructor(member, options));
                break;
            case 'field':
                members.push(convertMemberField(member));
                break;
            case 'const':
                members.push(convertMemberConst(member));
                break;
            case 'iterable': {
                var indexedPropertyGetter = idl.members.find(function (member) {
                    return member.type === 'operation' && member.special === 'getter' && member.arguments[0].idlType.idlType === 'unsigned long';
                });
                if ((indexedPropertyGetter && member.idlType.length === 1) || member.idlType.length === 2) {
                    var keyType = convertType(indexedPropertyGetter ? indexedPropertyGetter.arguments[0].idlType : member.idlType[0]);
                    var valueType = convertType(member.idlType[member.idlType.length - 1]);
                    members.push.apply(members, createIterableMethods(idl.name, keyType, valueType, member.idlType.length === 2, member.async));
                }
                break;
            }
            case 'setlike':
                inheritance.push(ts.createExpressionWithTypeArguments([convertType(member.idlType[0])], ts.createIdentifier(member.readonly ? 'ReadonlySet' : 'Set')));
                break;
            case 'maplike':
                inheritance.push(ts.createExpressionWithTypeArguments([convertType(member.idlType[0]), convertType(member.idlType[1])], ts.createIdentifier(member.readonly ? 'ReadonlyMap' : 'Map')));
                break;
            default:
                console.log(newUnsupportedError('Unsupported IDL member', member));
                break;
        }
    });
    if (inheritance.length === 1 && !members.length) {
        return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(idl.name), undefined, inheritance[0]);
    }
    if (options === null || options === void 0 ? void 0 : options.emscripten) {
        return ts.createClassDeclaration(undefined, [], ts.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
    }
    return ts.createInterfaceDeclaration(undefined, [], ts.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
}
function convertInterfaceIncludes(idl) {
    return ts.createInterfaceDeclaration(undefined, [], ts.createIdentifier(idl.target), undefined, [
        ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            ts.createExpressionWithTypeArguments(undefined, ts.createIdentifier(idl.includes)),
        ]),
    ], []);
}
function createAttributeGetter(value) {
    return ts.createMethodSignature([], [], convertType(value.idlType), 'get_' + value.name, undefined);
}
function createAttributeSetter(value) {
    var parameter = ts.createParameter([], [], undefined, value.name, undefined, convertType(value.idlType));
    return ts.createMethodSignature([], [parameter], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), 'set_' + value.name, undefined);
}
function convertMemberOperation(idl) {
    var args = idl.arguments.map(convertArgument);
    return ts.createMethodSignature([], args, convertType(idl.idlType), idl.name, undefined);
}
function convertMemberConstructor(idl, options) {
    var args = idl.arguments.map(convertArgument);
    if (options.emscripten) {
        return ts.createMethodSignature([], args, undefined, 'constructor', undefined);
    }
    return ts.createConstructSignature([], args, undefined);
}
function convertMemberField(idl) {
    var optional = !idl.required ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.createPropertySignature(undefined, ts.createIdentifier(idl.name), optional, convertType(idl.idlType), undefined);
}
function convertMemberConst(idl) {
    return ts.createPropertySignature([ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)], ts.createIdentifier(idl.name), undefined, convertType(idl.idlType), undefined);
}
function convertMemberAttribute(idl) {
    return ts.createPropertySignature([idl.readonly ? ts.createModifier(ts.SyntaxKind.ReadonlyKeyword) : null].filter(function (it) { return it != null; }), ts.createIdentifier(idl.name), undefined, convertType(idl.idlType), undefined);
}
function convertArgument(idl) {
    var optional = idl.optional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.createParameter([], [], undefined, idl.name, optional, convertType(idl.idlType));
}
function makeFinalType(type, idl) {
    if (idl.nullable) {
        return ts.factory.createUnionTypeNode([type, ts.factory.createNull()]);
    }
    return type;
}
function convertType(idl) {
    if (typeof idl.idlType === 'string') {
        var type = baseTypeConversionMap.get(idl.idlType) || idl.idlType;
        switch (type) {
            case 'number':
                return makeFinalType(ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), idl);
            case 'string':
                return makeFinalType(ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), idl);
            case 'void':
                return ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
            default:
                return makeFinalType(ts.createTypeReferenceNode(type, []), idl);
        }
    }
    if (idl.generic) {
        var type = baseTypeConversionMap.get(idl.generic) || idl.generic;
        return makeFinalType(ts.createTypeReferenceNode(ts.createIdentifier(type), idl.idlType.map(convertType)), idl);
    }
    if (idl.union) {
        return ts.createUnionTypeNode(idl.idlType.map(convertType));
    }
    console.log(newUnsupportedError('Unsupported IDL type', idl));
    return ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}
function convertEnum(idl) {
    return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(idl.name), undefined, ts.createUnionTypeNode(idl.values.map(function (it) { return ts.createLiteralTypeNode(ts.createStringLiteral(it.value)); })));
}
function convertCallback(idl) {
    return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(idl.name), undefined, ts.createFunctionTypeNode(undefined, idl.arguments.map(convertArgument), convertType(idl.idlType)));
}
function newUnsupportedError(message, idl) {
    return new Error("\n  " + message + "\n  " + JSON.stringify(idl, null, 2) + "\n\n  Please file an issue at https://github.com/giniedp/webidl2ts and provide the used idl file or example.\n");
}

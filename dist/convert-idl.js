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
exports.convertIDL = void 0;
var ts = __importStar(require("typescript"));
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
var baseTypeConversionMap = new Map(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], __spreadArray([], bufferSourceTypes, true).map(function (type) { return [type, type]; }), true), __spreadArray([], integerTypes, true).map(function (type) { return [type, 'number']; }), true), __spreadArray([], floatTypes, true).map(function (type) { return [type, 'number']; }), true), __spreadArray([], stringTypes, true).map(function (type) { return [type, 'string']; }), true), __spreadArray([], sameTypes, true).map(function (type) { return [type, type]; }), true), [
    ['object', 'any'],
    ['sequence', 'Array'],
    ['record', 'Record'],
    ['FrozenArray', 'ReadonlyArray'],
    ['EventHandler', 'EventHandler'],
    ['VoidPtr', 'unknown'],
], false));
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
                        nodes.push(ts.factory.createVariableStatement([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.factory.createVariableDeclarationList([
                            ts.factory.createVariableDeclaration(ts.factory.createIdentifier(rootType.name), undefined, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(rootType.name), undefined), undefined),
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
    return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, convertType(idl.idlType));
}
function createIterableMethods(name, keyType, valueType, pair, async, declarations) {
    var result = [];
    var iteratorName = async ? '[Symbol.asyncIterator]' : '[Symbol.iterator]';
    var iteratorType = ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), pair ? [ts.factory.createTupleTypeNode([keyType, valueType])] : [valueType]);
    result.push(declarations
        ? ts.factory.createMethodDeclaration(undefined, undefined, iteratorName, undefined, undefined, undefined, iteratorType, undefined)
        : ts.factory.createMethodSignature(undefined, iteratorName, undefined, undefined, undefined, iteratorType));
    var entriesName = 'entries';
    var entriesType = ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), [ts.factory.createTupleTypeNode([keyType, valueType])]);
    result.push(declarations
        ? ts.factory.createMethodDeclaration(undefined, undefined, entriesName, undefined, undefined, undefined, entriesType, undefined)
        : ts.factory.createMethodSignature(undefined, entriesName, undefined, undefined, undefined, entriesType));
    var keysName = 'keys';
    var keysType = ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), [keyType]);
    result.push(declarations
        ? ts.factory.createMethodDeclaration(undefined, undefined, keysName, undefined, undefined, undefined, keysType, undefined)
        : ts.factory.createMethodSignature(undefined, keysName, undefined, undefined, undefined, keysType));
    var valuesName = 'values';
    var valuesType = ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), [valueType]);
    result.push(declarations
        ? ts.factory.createMethodDeclaration(undefined, undefined, valuesName, undefined, undefined, undefined, valuesType, undefined)
        : ts.factory.createMethodSignature(undefined, valuesName, undefined, undefined, undefined, valuesType));
    var forEachName = 'forEach';
    var forEachParameters = [
        ts.factory.createParameterDeclaration([], undefined, 'callbackfn', undefined, ts.factory.createFunctionTypeNode([], [
            ts.factory.createParameterDeclaration([], undefined, 'value', undefined, valueType),
            ts.factory.createParameterDeclaration([], undefined, pair ? 'key' : 'index', undefined, keyType),
            ts.factory.createParameterDeclaration([], undefined, pair ? 'iterable' : 'array', undefined, pair ? ts.factory.createTypeReferenceNode(name, []) : ts.factory.createArrayTypeNode(valueType)),
        ], ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword))),
        ts.factory.createParameterDeclaration([], undefined, 'thisArg', ts.factory.createToken(ts.SyntaxKind.QuestionToken), ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
    ];
    var forEachType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
    result.push(declarations
        ? ts.factory.createMethodDeclaration(undefined, undefined, forEachName, undefined, undefined, forEachParameters, forEachType, undefined)
        : ts.factory.createMethodSignature(undefined, forEachName, undefined, undefined, forEachParameters, forEachType));
    return result;
}
function convertInterface(idl, options) {
    var typeMembers = [];
    var classMembers = [];
    var inheritance = [];
    if ('inheritance' in idl && idl.inheritance) {
        inheritance.push(ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.inheritance), undefined));
    }
    idl.members.forEach(function (member) {
        switch (member.type) {
            case 'attribute':
                if (options === null || options === void 0 ? void 0 : options.emscripten) {
                    classMembers.push(createAttributeGetter(member), createAttributeSetter(member), convertMemberAttribute(member, true));
                }
                else {
                    typeMembers.push(convertMemberAttribute(member, false));
                }
                break;
            case 'operation':
                if (options === null || options === void 0 ? void 0 : options.emscripten) {
                    classMembers.push(member.name === idl.name ? convertMemberConstructor(member, true) : convertMemberOperation(member, true));
                }
                else {
                    typeMembers.push(member.name === idl.name ? convertMemberConstructor(member, false) : convertMemberOperation(member, false));
                }
                break;
            case 'constructor':
                if (options === null || options === void 0 ? void 0 : options.emscripten) {
                    classMembers.push(convertMemberConstructor(member, true));
                }
                else {
                    typeMembers.push(convertMemberConstructor(member, false));
                }
                break;
            case 'field':
                if (options === null || options === void 0 ? void 0 : options.emscripten) {
                    classMembers.push(convertMemberField(member, true));
                }
                else {
                    typeMembers.push(convertMemberField(member, false));
                }
                break;
            case 'const':
                if (options === null || options === void 0 ? void 0 : options.emscripten) {
                    classMembers.push(convertMemberConst(member, true));
                }
                else {
                    typeMembers.push(convertMemberConst(member, false));
                }
                break;
            case 'iterable': {
                var indexedPropertyGetter = idl.members.find(function (member) {
                    return member.type === 'operation' && member.special === 'getter' && member.arguments[0].idlType.idlType === 'unsigned long';
                });
                if ((indexedPropertyGetter && member.idlType.length === 1) || member.idlType.length === 2) {
                    var keyType = convertType(indexedPropertyGetter ? indexedPropertyGetter.arguments[0].idlType : member.idlType[0]);
                    var valueType = convertType(member.idlType[member.idlType.length - 1]);
                    var pairs = member.idlType.length === 2;
                    if (options === null || options === void 0 ? void 0 : options.emscripten) {
                        classMembers.push.apply(classMembers, createIterableMethods(idl.name, keyType, valueType, pairs, member.async, true));
                    }
                    else {
                        typeMembers.push.apply(typeMembers, createIterableMethods(idl.name, keyType, valueType, pairs, member.async, false));
                    }
                }
                break;
            }
            default:
                console.log(newUnsupportedError('Unsupported IDL member', member));
                break;
        }
    });
    var name = ts.factory.createIdentifier(idl.name);
    var heritageClauses = inheritance.length ? [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)] : undefined;
    return (options === null || options === void 0 ? void 0 : options.emscripten)
        ? ts.factory.createClassDeclaration([], name, undefined, heritageClauses, classMembers)
        : ts.factory.createInterfaceDeclaration([], name, undefined, heritageClauses, typeMembers);
}
function convertInterfaceIncludes(idl) {
    return ts.factory.createInterfaceDeclaration([], ts.factory.createIdentifier(idl.target), undefined, [
        ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.includes), undefined),
        ]),
    ], []);
}
function createAttributeGetter(value) {
    return ts.factory.createMethodDeclaration(undefined, undefined, 'get_' + value.name, undefined, [], [], convertType(value.idlType), undefined);
}
function createAttributeSetter(value) {
    var parameter = ts.factory.createParameterDeclaration([], undefined, value.name, undefined, convertType(value.idlType));
    return ts.factory.createMethodDeclaration(undefined, undefined, 'set_' + value.name, undefined, [], [parameter], ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), undefined);
}
function convertMemberOperation(idl, declaration) {
    var name = idl.name;
    var args = idl.arguments.map(convertArgument);
    var type = convertType(idl.idlType);
    return declaration
        ? ts.factory.createMethodDeclaration(undefined, undefined, name, undefined, [], args, type, undefined)
        : ts.factory.createMethodSignature(undefined, name, undefined, [], args, type);
}
function convertMemberConstructor(idl, declaration) {
    var args = idl.arguments.map(convertArgument);
    return declaration
        ? ts.factory.createMethodDeclaration(undefined, undefined, 'constructor', undefined, [], args, undefined, undefined)
        : ts.factory.createConstructSignature([], args, undefined);
}
function convertMemberField(idl, declaration) {
    var name = ts.factory.createIdentifier(idl.name);
    var optional = !idl.required ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    var type = convertType(idl.idlType);
    return declaration
        ? ts.factory.createPropertyDeclaration(undefined, name, optional, type, undefined)
        : ts.factory.createPropertySignature(undefined, name, optional, type);
}
function convertMemberConst(idl, declaration) {
    var modifiers = [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)];
    var name = ts.factory.createIdentifier(idl.name);
    var type = convertType(idl.idlType);
    return declaration
        ? ts.factory.createPropertyDeclaration(modifiers, name, undefined, type, undefined)
        : ts.factory.createPropertySignature(modifiers, name, undefined, type);
}
function convertMemberAttribute(idl, declaration) {
    var modifiers = [idl.readonly ? ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword) : null].filter(function (it) { return it != null; });
    var name = ts.factory.createIdentifier(idl.name);
    var type = convertType(idl.idlType);
    return declaration
        ? ts.factory.createPropertyDeclaration(modifiers, name, undefined, type, undefined)
        : ts.factory.createPropertySignature(modifiers, name, undefined, type);
}
function convertArgument(idl) {
    var optional = idl.optional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.factory.createParameterDeclaration([], undefined, idl.name, optional, convertType(idl.idlType));
}
function convertType(idl) {
    if (typeof idl.idlType === 'string') {
        var type = baseTypeConversionMap.get(idl.idlType) || idl.idlType;
        switch (type) {
            case 'number':
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
            case 'string':
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
            case 'void':
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
            default:
                return ts.factory.createTypeReferenceNode(type, []);
        }
    }
    if (idl.generic) {
        var type = baseTypeConversionMap.get(idl.generic) || idl.generic;
        return ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), idl.idlType.map(convertType));
    }
    if (idl.union) {
        return ts.factory.createUnionTypeNode(idl.idlType.map(convertType));
    }
    console.log(newUnsupportedError('Unsupported IDL type', idl));
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}
function convertEnum(idl) {
    return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, ts.factory.createUnionTypeNode(idl.values.map(function (it) { return ts.factory.createLiteralTypeNode(ts.createStringLiteral(it.value)); })));
}
function convertCallback(idl) {
    return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, ts.factory.createFunctionTypeNode(undefined, idl.arguments.map(convertArgument), convertType(idl.idlType)));
}
function newUnsupportedError(message, idl) {
    return new Error("\n  ".concat(message, "\n  ").concat(JSON.stringify(idl, null, 2), "\n\n  Please file an issue at https://github.com/giniedp/webidl2ts and provide the used idl file or example.\n"));
}

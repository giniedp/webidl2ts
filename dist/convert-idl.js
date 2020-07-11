"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIDL = void 0;
var ts = require("typescript");
var bufferSourceTypes = ["ArrayBuffer", "ArrayBufferView", "DataView", "Int8Array", "Uint8Array", "Int16Array", "Uint16Array", "Uint8ClampedArray", "Int32Array", "Uint32Array", "Float32Array", "Float64Array"];
var integerTypes = ["byte", "octet", "short", "unsigned short", "long", "unsigned long", "long long", "unsigned long long"];
var stringTypes = ["ByteString", "DOMString", "USVString", "CSSOMString"];
var floatTypes = ["float", "unrestricted float", "double", "unrestricted double"];
var sameTypes = ["any", "boolean", "Date", "Function", "Promise", "void"];
var baseTypeConversionMap = new Map(__spreadArrays(__spreadArrays(bufferSourceTypes).map(function (type) { return [type, type]; }), __spreadArrays(integerTypes).map(function (type) { return [type, "number"]; }), __spreadArrays(floatTypes).map(function (type) { return [type, "number"]; }), __spreadArrays(stringTypes).map(function (type) { return [type, "string"]; }), __spreadArrays(sameTypes).map(function (type) { return [type, type]; }), [
    ["object", "any"],
    ["sequence", "Array"],
    ["record", "Record"],
    ["FrozenArray", "ReadonlyArray"],
    ["EventHandler", "EventHandler"],
    ["VoidPtr", "unknown"]
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
                        nodes.push(ts.createVariableStatement([ts.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.createVariableDeclarationList([ts.createVariableDeclaration(ts.createIdentifier(rootType.name), ts.createTypeReferenceNode(ts.createIdentifier(rootType.name), undefined), undefined)], undefined)));
                    }
                }
                break;
            case 'includes':
                nodes.push(convertInterfaceIncludes(rootType));
                break;
            case 'enum':
                nodes.push(convertEnum(rootType, options));
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
                else {
                    members.push(convertMemberAttribute(member));
                }
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
            case 'iterable':
                inheritance.push(ts.createExpressionWithTypeArguments(member.idlType.map(function (it) { return convertType(it); }), ts.createIdentifier("Iterable")));
                break;
            default:
                console.log(newUnsupportedError('Unsupported IDL member', member));
                break;
        }
    });
    if (options === null || options === void 0 ? void 0 : options.emscripten) {
        return ts.createClassDeclaration(undefined, [], ts.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
    }
    return ts.createInterfaceDeclaration(undefined, [], ts.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
}
function convertInterfaceIncludes(idl) {
    return ts.createInterfaceDeclaration(undefined, [], ts.createIdentifier(idl.target), undefined, [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.createExpressionWithTypeArguments(undefined, ts.createIdentifier(idl.includes))])], []);
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
    return ts.createPropertySignature([
        idl.readonly ? ts.createModifier(ts.SyntaxKind.ReadonlyKeyword) : null,
    ].filter(function (it) { return it != null; }), ts.createIdentifier(idl.name), undefined, convertType(idl.idlType), undefined);
}
function convertArgument(idl) {
    var optional = idl.optional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.createParameter([], [], undefined, idl.name, optional, convertType(idl.idlType));
}
function convertType(idl) {
    if (typeof idl.idlType === 'string') {
        var type = baseTypeConversionMap.get(idl.idlType) || idl.idlType;
        switch (type) {
            case 'number':
                return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
            case 'string':
                return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
            case 'void':
                return ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
            default:
                return ts.createTypeReferenceNode(type, []);
        }
    }
    if (idl.generic) {
        var type = baseTypeConversionMap.get(idl.generic) || idl.generic;
        return ts.createTypeReferenceNode(ts.createIdentifier(type), idl.idlType.map(convertType));
    }
    if (idl.union) {
        return ts.createUnionTypeNode(idl.idlType.map(convertType));
    }
    console.log(newUnsupportedError('Unsupported IDL type', idl));
    return ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}
function convertEnum(idl, options) {
    if (options === null || options === void 0 ? void 0 : options.emscripten) {
        var members = idl.values.map(function (it) { return ts.createEnumMember(it.value, null); });
        return ts.createEnumDeclaration([], [], idl.name, members);
    }
    return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(idl.name), undefined, ts.createUnionTypeNode(idl.values.map(function (it) { return ts.createLiteralTypeNode(ts.createStringLiteral(it.value)); })));
}
function convertCallback(idl) {
    return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(idl.name), undefined, ts.createFunctionTypeNode(undefined, idl.arguments.map(convertArgument), convertType(idl.idlType)));
}
function newUnsupportedError(message, idl) {
    return new Error("\n  " + message + "\n  " + JSON.stringify(idl, null, 2) + "\n\n  Please file an issue and provide the used idl file.\n");
}

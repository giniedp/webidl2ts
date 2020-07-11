"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixes = void 0;
exports.fixes = {
    'inheritance': function (idlString) {
        // need fix for error:
        //
        //      WebIDLParseError: Syntax error at line 49, since `interface btVector4`:
        //      btVector4 implements btVector3;
        //      ^ Unrecognised tokens
        //
        // current solution:
        // find everything that match
        //
        //      LEFT implements RIGHT;
        //
        // and comment them out
        // then replace all occurence
        //
        //      interface LEFT {
        //
        // with
        //
        //      interface LEFT: RIGHT {
        //
        var inheritance = [];
        idlString = idlString.replace(/([a-zA-Z0-9]+) implements ([a-zA-Z0-9]+);/gi, function (line, left, right) {
            inheritance.push({ left: left, right: right });
            return "// " + line;
        });
        inheritance.forEach(function (_a) {
            var left = _a.left, right = _a.right;
            idlString = idlString.replace(new RegExp("interface " + left + " {"), "interface " + left + ": " + right + " {");
        });
        return idlString;
    },
    'array': function (idlString) {
        // need fix for error:
        //
        //      WebIDLParseError: Syntax error at line 102, since `interface btTransform`:
        //        void setFromOpenGLMatrix(float[] m)
        //                                 ^ Unterminated operation
        //
        // current solution: use sequence<float> type
        return idlString
            .replace(/attribute (\w+)\[\]/gi, function (match, group) {
            return "attribute FrozenArray<" + group + ">";
        })
            .replace(/float\[\]/gi, 'FrozenArray<float>')
            .replace(/long\[\]/gi, 'FrozenArray<long>');
    },
};

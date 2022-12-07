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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchIDL = void 0;
var https = __importStar(require("https"));
var fs = __importStar(require("fs"));
var jsdom_1 = require("jsdom");
var idlSelector = [
    'pre.idl:not(.extract):not(.example)',
    'pre.code code.idl-code',
    'pre:not(.extract) code.idl',
    '#permission-registry + pre.highlight', // Permissions
].join(',');
function fetchIDL(uri) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!fs.existsSync(uri)) return [3 /*break*/, 1];
                    result = fs.readFileSync(uri).toString();
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, getUrl(uri)];
                case 2:
                    result = _a.sent();
                    _a.label = 3;
                case 3:
                    if (uri.match(/\.w?idl$/)) {
                        return [2 /*return*/, result];
                    }
                    return [2 /*return*/, extractIDL(jsdom_1.JSDOM.fragment(result))];
            }
        });
    });
}
exports.fetchIDL = fetchIDL;
function extractIDL(dom) {
    var elements = Array.from(dom.querySelectorAll(idlSelector)).filter(function (el) {
        if (el.parentElement && el.parentElement.classList.contains('example')) {
            return false;
        }
        var previous = el.previousElementSibling;
        if (!previous) {
            return true;
        }
        return !previous.classList.contains('atrisk') && !previous.textContent.includes('IDL Index');
    });
    return elements.map(function (element) { return trimCommonIndentation(element.textContent).trim(); }).join('\n\n');
}
/**
 * Remove common indentation:
 *     <pre>
 *       typedef Type = "type";
 *
 *       dictionary Dictionary {
 *         "member"
 *       };
 *     </pre>
 * Here the textContent has 6 common preceding whitespaces that can be unindented.
 */
function trimCommonIndentation(text) {
    var lines = text.split('\n');
    if (!lines[0].trim()) {
        lines.shift();
    }
    if (!lines[lines.length - 1].trim()) {
        lines.pop();
    }
    var commonIndentation = Math.min.apply(Math, lines.filter(function (line) { return line.trim(); }).map(getIndentation));
    return lines.map(function (line) { return line.slice(commonIndentation); }).join('\n');
}
/**
 * Count preceding whitespaces
 */
function getIndentation(line) {
    var count = 0;
    for (var _i = 0, line_1 = line; _i < line_1.length; _i++) {
        var ch = line_1[_i];
        if (ch !== ' ') {
            break;
        }
        count++;
    }
    return count;
}
function getUrl(url) {
    return new Promise(function (resolve, reject) {
        https
            .get(url, function (resp) {
            var data = '';
            resp.on('data', function (chunk) { return (data += chunk); });
            resp.on('end', function () { return resolve(data); });
        })
            .on('error', reject);
    });
}

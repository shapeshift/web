"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bnOrZero = exports.bn = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const bn = (n, base = 10) => new bignumber_js_1.default(n, base);
exports.bn = bn;
const bnOrZero = (n) => {
    const value = (0, exports.bn)(n || 0);
    return value.isNaN() ? (0, exports.bn)(0) : value;
};
exports.bnOrZero = bnOrZero;

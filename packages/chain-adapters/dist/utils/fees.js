"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcFee = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const bignumber_1 = require("./bignumber");
const calcFee = (fee, speed, scalars) => {
    return (0, bignumber_1.bnOrZero)(fee).times(scalars[speed]).toFixed(0, bignumber_js_1.default.ROUND_CEIL).toString();
};
exports.calcFee = calcFee;

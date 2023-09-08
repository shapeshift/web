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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetIdToCoinCap = exports.coincapToAssetId = exports.coincapUrl = void 0;
const invert_1 = __importDefault(require("lodash/invert"));
const toLower_1 = __importDefault(require("lodash/toLower"));
const adapters = __importStar(require("./generated"));
exports.coincapUrl = 'https://api.coincap.io/v2/assets?limit=2000';
const generatedAssetIdToCoinCapMap = Object.values(adapters).reduce((acc, cur) => ({
    ...acc,
    ...cur,
}));
const generatedCoinCapToAssetIdMap = (0, invert_1.default)(generatedAssetIdToCoinCapMap);
const coincapToAssetId = (id) => generatedCoinCapToAssetIdMap[id];
exports.coincapToAssetId = coincapToAssetId;
const assetIdToCoinCap = (assetId) => generatedAssetIdToCoinCapMap[(0, toLower_1.default)(assetId)];
exports.assetIdToCoinCap = assetIdToCoinCap;

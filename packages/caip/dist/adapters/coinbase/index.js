"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetIdToCoinbaseTicker = exports.coinbaseTickerToAssetId = void 0;
const invert_1 = __importDefault(require("lodash/invert"));
const toLower_1 = __importDefault(require("lodash/toLower"));
const generated_1 = require("./generated");
// As of 2022/06/13 (ETH/BTC/COSMOS assets)
const assetIdToCoinbaseTickerMap = generated_1.tickerMap;
const coinbaseAssetIdToAssetIdMap = (0, invert_1.default)(assetIdToCoinbaseTickerMap);
const coinbaseTickerToAssetId = (id) => coinbaseAssetIdToAssetIdMap[id];
exports.coinbaseTickerToAssetId = coinbaseTickerToAssetId;
const assetIdToCoinbaseTicker = (assetId) => assetIdToCoinbaseTickerMap[(0, toLower_1.default)(assetId)];
exports.assetIdToCoinbaseTicker = assetIdToCoinbaseTicker;

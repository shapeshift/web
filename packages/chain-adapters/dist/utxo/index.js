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
Object.defineProperty(exports, "__esModule", { value: true });
exports.utxoSelect = exports.litecoin = exports.dogecoin = exports.bitcoincash = exports.bitcoin = exports.utxo = exports.UtxoBaseAdapter = exports.utxoChainIds = void 0;
var UtxoBaseAdapter_1 = require("./UtxoBaseAdapter");
Object.defineProperty(exports, "utxoChainIds", { enumerable: true, get: function () { return UtxoBaseAdapter_1.utxoChainIds; } });
Object.defineProperty(exports, "UtxoBaseAdapter", { enumerable: true, get: function () { return UtxoBaseAdapter_1.UtxoBaseAdapter; } });
exports.utxo = __importStar(require("./types"));
exports.bitcoin = __importStar(require("./bitcoin"));
exports.bitcoincash = __importStar(require("./bitcoincash"));
exports.dogecoin = __importStar(require("./dogecoin"));
exports.litecoin = __importStar(require("./litecoin"));
var utxoSelect_1 = require("./utxoSelect");
Object.defineProperty(exports, "utxoSelect", { enumerable: true, get: function () { return utxoSelect_1.utxoSelect; } });

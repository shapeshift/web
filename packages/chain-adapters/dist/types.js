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
exports.ChainAdapterDisplayName = exports.ValidAddressResultType = exports.FeeDataKey = exports.utxo = exports.evm = exports.cosmossdk = void 0;
const cosmossdk = __importStar(require("./cosmossdk/types"));
exports.cosmossdk = cosmossdk;
const evm = __importStar(require("./evm/types"));
exports.evm = evm;
const utxo = __importStar(require("./utxo/types"));
exports.utxo = utxo;
var FeeDataKey;
(function (FeeDataKey) {
    FeeDataKey["Slow"] = "slow";
    FeeDataKey["Average"] = "average";
    FeeDataKey["Fast"] = "fast";
})(FeeDataKey || (exports.FeeDataKey = FeeDataKey = {}));
var ValidAddressResultType;
(function (ValidAddressResultType) {
    ValidAddressResultType["Valid"] = "valid";
    ValidAddressResultType["Invalid"] = "invalid";
})(ValidAddressResultType || (exports.ValidAddressResultType = ValidAddressResultType = {}));
var ChainAdapterDisplayName;
(function (ChainAdapterDisplayName) {
    ChainAdapterDisplayName["Thorchain"] = "THORChain";
    ChainAdapterDisplayName["Ethereum"] = "Ethereum";
    ChainAdapterDisplayName["Avalanche"] = "Avalanche C-Chain";
    ChainAdapterDisplayName["Optimism"] = "Optimism";
    ChainAdapterDisplayName["BnbSmartChain"] = "BNB Smart Chain";
    ChainAdapterDisplayName["Polygon"] = "Polygon";
    ChainAdapterDisplayName["Gnosis"] = "Gnosis";
    ChainAdapterDisplayName["Cosmos"] = "Cosmos";
    ChainAdapterDisplayName["Bitcoin"] = "Bitcoin";
    ChainAdapterDisplayName["BitcoinCash"] = "Bitcoin Cash";
    ChainAdapterDisplayName["Dogecoin"] = "Dogecoin";
    ChainAdapterDisplayName["Litecoin"] = "Litecoin";
})(ChainAdapterDisplayName || (exports.ChainAdapterDisplayName = ChainAdapterDisplayName = {}));

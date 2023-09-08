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
exports.bnbsmartchain = exports.gnosis = exports.polygon = exports.optimism = exports.avalanche = exports.ethereum = exports.evm = exports.EvmBaseAdapter = exports.evmChainIds = exports.isEvmChainId = void 0;
var EvmBaseAdapter_1 = require("./EvmBaseAdapter");
Object.defineProperty(exports, "isEvmChainId", { enumerable: true, get: function () { return EvmBaseAdapter_1.isEvmChainId; } });
Object.defineProperty(exports, "evmChainIds", { enumerable: true, get: function () { return EvmBaseAdapter_1.evmChainIds; } });
Object.defineProperty(exports, "EvmBaseAdapter", { enumerable: true, get: function () { return EvmBaseAdapter_1.EvmBaseAdapter; } });
exports.evm = __importStar(require("./types"));
exports.ethereum = __importStar(require("./ethereum"));
exports.avalanche = __importStar(require("./avalanche"));
exports.optimism = __importStar(require("./optimism"));
exports.polygon = __importStar(require("./polygon"));
exports.gnosis = __importStar(require("./gnosis"));
exports.bnbsmartchain = __importStar(require("./bnbsmartchain"));

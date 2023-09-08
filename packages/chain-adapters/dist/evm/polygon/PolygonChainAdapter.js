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
exports.ChainAdapter = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("@shapeshiftoss/types");
const unchained = __importStar(require("@shapeshiftoss/unchained-client"));
const types_2 = require("../../types");
const EvmBaseAdapter_1 = require("../EvmBaseAdapter");
const SUPPORTED_CHAIN_IDS = [types_1.KnownChainIds.PolygonMainnet];
const DEFAULT_CHAIN_ID = types_1.KnownChainIds.PolygonMainnet;
class ChainAdapter extends EvmBaseAdapter_1.EvmBaseAdapter {
    constructor(args) {
        super({
            assetId: caip_1.polygonAssetId,
            chainId: DEFAULT_CHAIN_ID,
            supportedChainIds: SUPPORTED_CHAIN_IDS,
            defaultBIP44Params: ChainAdapter.defaultBIP44Params,
            parser: new unchained.polygon.TransactionParser({
                assetId: caip_1.polygonAssetId,
                chainId: args.chainId ?? DEFAULT_CHAIN_ID,
                rpcUrl: args.rpcUrl,
                api: args.providers.http,
            }),
            ...args,
        });
    }
    getDisplayName() {
        return types_2.ChainAdapterDisplayName.Polygon;
    }
    getName() {
        const enumIndex = Object.values(types_2.ChainAdapterDisplayName).indexOf(types_2.ChainAdapterDisplayName.Polygon);
        return Object.keys(types_2.ChainAdapterDisplayName)[enumIndex];
    }
    getType() {
        return types_1.KnownChainIds.PolygonMainnet;
    }
    getFeeAssetId() {
        return this.assetId;
    }
}
exports.ChainAdapter = ChainAdapter;
ChainAdapter.defaultBIP44Params = {
    purpose: 44,
    coinType: Number(caip_1.ASSET_REFERENCE.Polygon),
    accountNumber: 0,
};

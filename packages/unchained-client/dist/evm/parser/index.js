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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTransactionParser = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const bignumber_js_1 = require("bignumber.js");
const ethers_1 = require("ethers");
const types_1 = require("../../types");
const utils_1 = require("../../utils");
const utils_2 = require("./utils");
__exportStar(require("./types"), exports);
__exportStar(require("./utils"), exports);
class BaseTransactionParser {
    constructor(args) {
        this.parsers = [];
        this.chainId = args.chainId;
        this.assetId = args.assetId;
        this.api = args.api;
        this.provider = new ethers_1.ethers.providers.JsonRpcBatchProvider(args.rpcUrl);
    }
    /**
     * Register custom transaction sub parser to extract contract specific data
     *
     * _parsers should be registered from most generic first to most specific last_
     */
    registerParser(parser) {
        this.parsers.unshift(parser);
    }
    registerParsers(parsers) {
        parsers.forEach(parser => this.registerParser(parser));
    }
    async parse(tx, address) {
        address = ethers_1.ethers.utils.getAddress(address);
        // We expect only one Parser to return a result. If multiple do, we take the first and early exit.
        const contractParserResult = await (0, utils_1.findAsyncSequential)(this.parsers, async (parser) => await parser.parse(tx, address));
        const parsedTx = {
            address,
            blockHash: tx.blockHash,
            blockHeight: tx.blockHeight,
            blockTime: tx.timestamp,
            chainId: this.chainId,
            confirmations: tx.confirmations,
            status: this.getStatus(tx),
            trade: contractParserResult?.trade,
            transfers: contractParserResult?.transfers ?? [],
            txid: tx.txid,
            data: contractParserResult?.data,
        };
        return this.getParsedTxWithTransfers(tx, parsedTx, address);
    }
    getStatus(tx) {
        return (0, utils_2.getTxStatus)(tx);
    }
    getParsedTxWithTransfers(tx, parsedTx, address) {
        if (address === tx.from) {
            // send amount
            const sendValue = new bignumber_js_1.BigNumber(tx.value);
            if (sendValue.gt(0)) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)({
                    assetId: this.assetId,
                    from: tx.from,
                    to: tx.to,
                    transfers: parsedTx.transfers,
                    type: types_1.TransferType.Send,
                    value: sendValue.toString(10),
                });
            }
            // network fee
            const fees = new bignumber_js_1.BigNumber(tx.fee);
            if (fees.gt(0)) {
                parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) };
            }
        }
        if (address === tx.to) {
            // receive amount
            const receiveValue = new bignumber_js_1.BigNumber(tx.value);
            if (receiveValue.gt(0)) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)({
                    assetId: this.assetId,
                    from: tx.from,
                    to: tx.to,
                    transfers: parsedTx.transfers,
                    type: types_1.TransferType.Receive,
                    value: receiveValue.toString(10),
                });
            }
        }
        tx.tokenTransfers?.forEach(transfer => {
            // FTX Token (FTT) name and symbol was set backwards on the ERC20 contract (Ethereum Mainnet)
            if (this.chainId === caip_1.ethChainId &&
                transfer.contract === '0x50D1c9771902476076eCFc8B2A83Ad6b9355a4c9') {
                transfer.name = transfer.symbol;
                transfer.symbol = transfer.name;
            }
            const token = {
                contract: transfer.contract,
                decimals: transfer.decimals,
                name: transfer.name,
                symbol: transfer.symbol,
            };
            const assetId = (() => {
                // alias ether token on optimism to native asset as they are the same
                if (transfer.contract === '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000') {
                    return (0, caip_1.toAssetId)({
                        chainId: this.chainId,
                        assetNamespace: 'slip44',
                        assetReference: caip_1.ASSET_REFERENCE.Optimism,
                    });
                }
                // alias matic token on matic to native asset as they are the same
                if (transfer.contract === '0x0000000000000000000000000000000000001010') {
                    return (0, caip_1.toAssetId)({
                        chainId: this.chainId,
                        assetNamespace: 'slip44',
                        assetReference: caip_1.ASSET_REFERENCE.Polygon,
                    });
                }
                const assetNamespace = (() => {
                    switch (transfer.type) {
                        case 'ERC20':
                            return caip_1.ASSET_NAMESPACE.erc20;
                        case 'ERC721':
                            return caip_1.ASSET_NAMESPACE.erc721;
                        case 'ERC1155':
                            return caip_1.ASSET_NAMESPACE.erc1155;
                        case 'BEP20':
                            return caip_1.ASSET_NAMESPACE.bep20;
                        case 'BEP721':
                            return caip_1.ASSET_NAMESPACE.bep721;
                        case 'BEP1155':
                            return caip_1.ASSET_NAMESPACE.bep1155;
                        default:
                            return;
                    }
                })();
                if (!assetNamespace)
                    return;
                return (0, caip_1.toAssetId)({
                    chainId: this.chainId,
                    assetNamespace,
                    assetReference: transfer.id ? `${transfer.contract}/${transfer.id}` : transfer.contract,
                });
            })();
            if (!assetId)
                return;
            const makeTokenTransferArgs = (type) => ({
                assetId,
                from: transfer.from,
                id: transfer.id,
                to: transfer.to,
                token,
                transfers: parsedTx.transfers,
                type,
                value: transfer.value,
            });
            // token send amount
            if (address === transfer.from) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)(makeTokenTransferArgs(types_1.TransferType.Send));
            }
            // token receive amount
            if (address === transfer.to) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)(makeTokenTransferArgs(types_1.TransferType.Receive));
            }
        });
        tx.internalTxs?.forEach(internalTx => {
            const makeInternalTransferArgs = (type) => ({
                assetId: this.assetId,
                from: internalTx.from,
                to: internalTx.to,
                transfers: parsedTx.transfers,
                type,
                value: internalTx.value,
            });
            // internal eth send
            if (address === internalTx.from) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)(makeInternalTransferArgs(types_1.TransferType.Send));
            }
            // internal eth receive
            if (address === internalTx.to) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)(makeInternalTransferArgs(types_1.TransferType.Receive));
            }
        });
        return parsedTx;
    }
}
exports.BaseTransactionParser = BaseTransactionParser;

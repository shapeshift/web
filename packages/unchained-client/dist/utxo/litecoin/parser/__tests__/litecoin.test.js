"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("../../../../types");
const index_1 = require("../index");
const standardNoChange_1 = __importDefault(require("./mockData/standardNoChange"));
const standardWithChange_1 = __importDefault(require("./mockData/standardWithChange"));
const txParser = new index_1.TransactionParser({ chainId: caip_1.ltcChainId, assetId: caip_1.ltcAssetId });
describe('parseTx', () => {
    describe('standard', () => {
        it('should be able to parse standard send with no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.ltcChainId,
                fee: {
                    assetId: caip_1.ltcAssetId,
                    value: '100000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
                        to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '340524408',
                        components: [{ value: '340524408' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.ltcChainId,
                fee: {
                    assetId: caip_1.ltcAssetId,
                    value: '100000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
                        to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '340524408',
                        components: [{ value: '340524408' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive with no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.ltcChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
                        to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '340424408',
                        components: [{ value: '340424408' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive with no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.ltcChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
                        to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '340424408',
                        components: [{ value: '340424408' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change mempool', async () => {
            const { txMempool } = standardWithChange_1.default;
            const address = 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.ltcChainId,
                fee: {
                    assetId: caip_1.ltcAssetId,
                    value: '100000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: 'LXPf92CJycUi5JogY3NXEgYqZygTkEXrsy',
                        from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '147680075',
                        components: [{ value: '147680075' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
                        from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '31465800',
                        components: [{ value: '31465800' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change', async () => {
            const { tx } = standardWithChange_1.default;
            const address = 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.ltcChainId,
                fee: {
                    assetId: caip_1.ltcAssetId,
                    value: '100000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: 'LXPf92CJycUi5JogY3NXEgYqZygTkEXrsy',
                        from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '147680075',
                        components: [{ value: '147680075' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
                        from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
                        assetId: caip_1.ltcAssetId,
                        totalValue: '31465800',
                        components: [{ value: '31465800' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
});

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
const txParser = new index_1.TransactionParser({ chainId: caip_1.dogeChainId, assetId: caip_1.dogeAssetId });
describe('parseTx', () => {
    describe('standard', () => {
        it('should be able to parse standard send with no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.dogeChainId,
                fee: {
                    assetId: caip_1.dogeAssetId,
                    value: '12050688',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
                        to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '750000000',
                        components: [{ value: '750000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP';
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.dogeChainId,
                fee: {
                    assetId: caip_1.dogeAssetId,
                    value: '12050688',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
                        to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '750000000',
                        components: [{ value: '750000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.dogeChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
                        to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '737949312',
                        components: [{ value: '737949312' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb';
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.dogeChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
                        to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '737949312',
                        components: [{ value: '737949312' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change mempool', async () => {
            const { txMempool } = standardWithChange_1.default;
            const address = 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.dogeChainId,
                fee: {
                    assetId: caip_1.dogeAssetId,
                    value: '125900000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: 'DHfvk82f2sCqsoUXzTyQSDUoF5YZVYoE1Y',
                        from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '70370021036118',
                        components: [{ value: '70370021036118' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
                        from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '70223692253218',
                        components: [{ value: '70223692253218' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change', async () => {
            const { tx } = standardWithChange_1.default;
            const address = 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N';
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.dogeChainId,
                fee: {
                    assetId: caip_1.dogeAssetId,
                    value: '125900000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: 'DHfvk82f2sCqsoUXzTyQSDUoF5YZVYoE1Y',
                        from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '70370021036118',
                        components: [{ value: '70370021036118' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
                        from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
                        assetId: caip_1.dogeAssetId,
                        totalValue: '70223692253218',
                        components: [{ value: '70223692253218' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
});

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
const txParser = new index_1.TransactionParser({ chainId: caip_1.btcChainId, assetId: caip_1.btcAssetId });
describe('parseTx', () => {
    describe('standard', () => {
        it('should be able to parse standard send with no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.btcChainId,
                fee: {
                    assetId: caip_1.btcAssetId,
                    value: '6528',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
                        to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
                        assetId: caip_1.btcAssetId,
                        totalValue: '12989718',
                        components: [{ value: '12989718' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj';
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.btcChainId,
                fee: {
                    assetId: caip_1.btcAssetId,
                    value: '6528',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
                        to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
                        assetId: caip_1.btcAssetId,
                        totalValue: '12989718',
                        components: [{ value: '12989718' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.btcChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
                        from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
                        assetId: caip_1.btcAssetId,
                        totalValue: '12983190',
                        components: [{ value: '12983190' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7';
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.btcChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
                        from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
                        assetId: caip_1.btcAssetId,
                        totalValue: '12983190',
                        components: [{ value: '12983190' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change mempool', async () => {
            const { txMempool } = standardWithChange_1.default;
            const address = '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.btcChainId,
                fee: {
                    assetId: caip_1.btcAssetId,
                    value: '6112',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: '1Ex6unDe3gt4twj8GDHTutUbKvvHzMPj3e',
                        from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
                        assetId: caip_1.btcAssetId,
                        totalValue: '4098889',
                        components: [{ value: '4098889' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
                        from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
                        assetId: caip_1.btcAssetId,
                        totalValue: '3908177',
                        components: [{ value: '3908177' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change', async () => {
            const { tx } = standardWithChange_1.default;
            const address = '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB';
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.btcChainId,
                fee: {
                    assetId: caip_1.btcAssetId,
                    value: '6112',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: '1Ex6unDe3gt4twj8GDHTutUbKvvHzMPj3e',
                        from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
                        assetId: caip_1.btcAssetId,
                        totalValue: '4098889',
                        components: [{ value: '4098889' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
                        from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
                        assetId: caip_1.btcAssetId,
                        totalValue: '3908177',
                        components: [{ value: '3908177' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
});

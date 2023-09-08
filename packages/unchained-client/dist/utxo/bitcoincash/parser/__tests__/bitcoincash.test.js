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
const txParser = new index_1.TransactionParser({ chainId: caip_1.bchChainId, assetId: caip_1.bchAssetId });
describe('parseTx', () => {
    describe('standard', () => {
        it('should be able to parse standard send with no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.bchChainId,
                fee: {
                    assetId: caip_1.bchAssetId,
                    value: '185',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs',
                        assetId: caip_1.bchAssetId,
                        totalValue: '10436903',
                        components: [{ value: '10436903' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.bchChainId,
                fee: {
                    assetId: caip_1.bchAssetId,
                    value: '185',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs',
                        assetId: caip_1.bchAssetId,
                        totalValue: '10436903',
                        components: [{ value: '10436903' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive no change mempool', async () => {
            const { txMempool } = standardNoChange_1.default;
            const address = 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.bchChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu',
                        assetId: caip_1.bchAssetId,
                        totalValue: '10436718',
                        components: [{ value: '10436718' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard receive no change', async () => {
            const { tx } = standardNoChange_1.default;
            const address = 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.bchChainId,
                transfers: [
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu',
                        assetId: caip_1.bchAssetId,
                        totalValue: '10436718',
                        components: [{ value: '10436718' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change mempool', async () => {
            const { txMempool } = standardWithChange_1.default;
            const address = 'bitcoincash:qzyjpr89qafwuety09edgrxz0snpaqrd0vvymq6ec0';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                address,
                chainId: caip_1.bchChainId,
                fee: {
                    assetId: caip_1.bchAssetId,
                    value: '220',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: 'bitcoincash:qzm7ax32nzkmlgf97qtq5vdmpvdx4xvjj5dlmputzn',
                        assetId: caip_1.bchAssetId,
                        totalValue: '8758569',
                        components: [{ value: '8758569' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.bchAssetId,
                        totalValue: '8752492',
                        components: [{ value: '8752492' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse standard send with change', async () => {
            const { tx } = standardWithChange_1.default;
            const address = 'bitcoincash:qzyjpr89qafwuety09edgrxz0snpaqrd0vvymq6ec0';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                address,
                chainId: caip_1.bchChainId,
                fee: {
                    assetId: caip_1.bchAssetId,
                    value: '220',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: 'bitcoincash:qzm7ax32nzkmlgf97qtq5vdmpvdx4xvjj5dlmputzn',
                        assetId: caip_1.bchAssetId,
                        totalValue: '8758569',
                        components: [{ value: '8758569' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.bchAssetId,
                        totalValue: '8752492',
                        components: [{ value: '8752492' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
});

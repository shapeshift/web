"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("../../../../types");
const index_1 = require("../index");
const standard_1 = __importDefault(require("./mockData/standard"));
const txParser = new index_1.TransactionParser({ chainId: caip_1.thorchainChainId, assetId: caip_1.thorchainAssetId });
describe('parseTx', () => {
    it('should be able to parse a standard send tx', async () => {
        const { tx, txNoFee, txWithFee } = standard_1.default;
        const address = 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc';
        const fee = {
            assetId: caip_1.thorchainAssetId,
            value: '12345',
        };
        const expected = {
            txid: tx.txid,
            blockHash: tx.blockHash,
            blockHeight: tx.blockHeight,
            blockTime: tx.timestamp,
            confirmations: tx.confirmations,
            status: types_1.TxStatus.Confirmed,
            address,
            chainId: caip_1.thorchainChainId,
            transfers: [
                {
                    type: types_1.TransferType.Send,
                    from: address,
                    to: 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6',
                    assetId: caip_1.thorchainAssetId,
                    totalValue: '1551500000000',
                    components: [{ value: '1551500000000' }],
                },
            ],
        };
        const expectedWithFee = { ...expected, fee };
        const actualWithFee = await txParser.parse(txWithFee, address);
        expect(expectedWithFee).toEqual(actualWithFee);
        const expectedNoFee = expected;
        const actualNoFee = await txParser.parse(txNoFee, address);
        expect(expectedNoFee).toEqual(actualNoFee);
    });
    it('should be able to parse a standard receive tx', async () => {
        const { tx } = standard_1.default;
        const address = 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6';
        const expected = {
            txid: tx.txid,
            blockHash: tx.blockHash,
            blockHeight: tx.blockHeight,
            blockTime: tx.timestamp,
            confirmations: tx.confirmations,
            status: types_1.TxStatus.Confirmed,
            address,
            chainId: caip_1.thorchainChainId,
            transfers: [
                {
                    type: types_1.TransferType.Receive,
                    from: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
                    to: address,
                    assetId: caip_1.thorchainAssetId,
                    totalValue: '1551500000000',
                    components: [{ value: '1551500000000' }],
                },
            ],
        };
        const actual = await txParser.parse(tx, address);
        expect(expected).toEqual(actual);
    });
});

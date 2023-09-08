"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("../../../../types");
const index_1 = require("../../index");
const index_2 = require("../index");
const erc20Approve_1 = __importDefault(require("./mockData/erc20Approve"));
const erc721_1 = __importDefault(require("./mockData/erc721"));
const erc1155_1 = __importDefault(require("./mockData/erc1155"));
const tokens_1 = require("./mockData/tokens");
const tokenSelfSend_1 = __importDefault(require("./mockData/tokenSelfSend"));
const tokenStandard_1 = __importDefault(require("./mockData/tokenStandard"));
const xdaiSelfSend_1 = __importDefault(require("./mockData/xdaiSelfSend"));
const xdaiStandard_1 = __importDefault(require("./mockData/xdaiStandard"));
const mockedApi = jest.mocked(new index_1.V1Api());
const tokenMetadata = {
    name: 'Foxy',
    description: 'The foxiest Fox',
    media: { url: 'http://foxy.fox', type: 'image' },
};
mockedApi.getTokenMetadata = jest.fn().mockResolvedValue(tokenMetadata);
const txParser = new index_2.TransactionParser({
    rpcUrl: '',
    chainId: caip_1.gnosisChainId,
    assetId: caip_1.gnosisAssetId,
    api: mockedApi,
});
describe('parseTx', () => {
    describe('standard', () => {
        describe('xdai', () => {
            it('should be able to parse xdai mempool send', async () => {
                const { txMempool } = xdaiStandard_1.default;
                const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x36023af898264B2f4095dA46d6c316D38C88C7DC',
                            from: address,
                            assetId: caip_1.gnosisAssetId,
                            totalValue: '10000000000000000000',
                            components: [{ value: '10000000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse xdai send', async () => {
                const { tx } = xdaiStandard_1.default;
                const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.gnosisAssetId,
                        value: '73332000000000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x36023af898264B2f4095dA46d6c316D38C88C7DC',
                            from: address,
                            assetId: caip_1.gnosisAssetId,
                            totalValue: '10000000000000000000',
                            components: [{ value: '10000000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse xdai mempool receive', async () => {
                const { txMempool } = xdaiStandard_1.default;
                const address = '0x36023af898264B2f4095dA46d6c316D38C88C7DC';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xecbb714842DA98B7c6FEB25937b13087ff443437',
                            assetId: caip_1.gnosisAssetId,
                            totalValue: '10000000000000000000',
                            components: [{ value: '10000000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse xdai receive', async () => {
                const { tx } = xdaiStandard_1.default;
                const address = '0x36023af898264B2f4095dA46d6c316D38C88C7DC';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xecbb714842DA98B7c6FEB25937b13087ff443437',
                            assetId: caip_1.gnosisAssetId,
                            totalValue: '10000000000000000000',
                            components: [{ value: '10000000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
        });
        describe('token', () => {
            it('should be able to parse token mempool send', async () => {
                const { txMempool } = tokenStandard_1.default;
                const address = '0x6B85a87d8990e77A86ab16A44b162de48BFb64E9';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token send', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0xE7aeB98322CD1f9680BC5e007Cac5f02B38d8745';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.gnosisAssetId,
                        value: '176442000823396',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            from: address,
                            to: '0x6B85a87d8990e77A86ab16A44b162de48BFb64E9',
                            assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
                            totalValue: '50920184',
                            components: [{ value: '50920184' }],
                            token: tokens_1.usdcToken,
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token mempool receive', async () => {
                const { txMempool } = tokenStandard_1.default;
                const address = '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token receive', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0x6B85a87d8990e77A86ab16A44b162de48BFb64E9';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            from: '0xE7aeB98322CD1f9680BC5e007Cac5f02B38d8745',
                            to: address,
                            assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
                            totalValue: '50920184',
                            components: [{ value: '50920184' }],
                            token: tokens_1.usdcToken,
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
        });
        describe('erc721', () => {
            it('should be able to parse mempool send', async () => {
                const { txMempool } = erc721_1.default;
                const address = '0x0000000000000000000000000000000000000000';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc721_1.default;
                const address = '0x0000000000000000000000000000000000000000';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '6642412': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0xe484E6012b3F5ACB9aD769ca173Dc8748DEC0d72',
                            from: address,
                            assetId: 'eip155:100/erc721:0x22c1f6050e56d2876009903609a2cc3fef83b415/6642412',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '6642412',
                            token: {
                                contract: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
                                decimals: 18,
                                name: 'POAP',
                                symbol: 'The Proof of Attendance Protocol',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = erc721_1.default;
                const address = '0xe484E6012b3F5ACB9aD769ca173Dc8748DEC0d72';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc721_1.default;
                const address = '0xe484E6012b3F5ACB9aD769ca173Dc8748DEC0d72';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '6642412': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x0000000000000000000000000000000000000000',
                            assetId: 'eip155:100/erc721:0x22c1f6050e56d2876009903609a2cc3fef83b415/6642412',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '6642412',
                            token: {
                                contract: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
                                decimals: 18,
                                name: 'POAP',
                                symbol: 'The Proof of Attendance Protocol',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
        });
        describe('erc1155', () => {
            it('should be able to parse mempool send', async () => {
                const { txMempool } = erc1155_1.default;
                const address = '0x0000000000000000000000000000000000000000';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc1155_1.default;
                const address = '0x0000000000000000000000000000000000000000';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '12857915': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x079CB50A38e4A9b7AF49adA16201D00c25Ad965F',
                            from: address,
                            assetId: 'eip155:100/erc1155:0xa67f1c6c96cb5dd6ef24b07a77893693c210d846/12857915',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '12857915',
                            token: {
                                contract: '0xa67f1C6c96CB5dD6eF24B07A77893693C210d846',
                                decimals: 18,
                                name: '',
                                symbol: '',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = erc1155_1.default;
                const address = '0x079CB50A38e4A9b7AF49adA16201D00c25Ad965F';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc1155_1.default;
                const address = '0x079CB50A38e4A9b7AF49adA16201D00c25Ad965F';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.gnosisChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '12857915': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x0000000000000000000000000000000000000000',
                            assetId: 'eip155:100/erc1155:0xa67f1c6c96cb5dd6ef24b07a77893693c210d846/12857915',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '12857915',
                            token: {
                                contract: '0xa67f1C6c96CB5dD6eF24B07A77893693C210d846',
                                decimals: 18,
                                name: '',
                                symbol: '',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
        });
    });
    describe('self send', () => {
        it('should be able to parse xdai mempool', async () => {
            const { txMempool } = xdaiSelfSend_1.default;
            const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.gnosisChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.gnosisAssetId,
                        totalValue: '10000000000000000000',
                        components: [{ value: '10000000000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.gnosisAssetId,
                        totalValue: '10000000000000000000',
                        components: [{ value: '10000000000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse xdai', async () => {
            const { tx } = xdaiSelfSend_1.default;
            const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.gnosisChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.gnosisAssetId,
                    value: '73332000000000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.gnosisAssetId,
                        totalValue: '10000000000000000000',
                        components: [{ value: '10000000000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.gnosisAssetId,
                        totalValue: '10000000000000000000',
                        components: [{ value: '10000000000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token mempool', async () => {
            const { txMempool } = tokenSelfSend_1.default;
            const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.gnosisChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token', async () => {
            const { tx } = tokenSelfSend_1.default;
            const address = '0xE7aeB98322CD1f9680BC5e007Cac5f02B38d8745';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.gnosisChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.gnosisAssetId,
                    value: '176442000823396',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: address,
                        assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
                        totalValue: '50920184',
                        components: [{ value: '50920184' }],
                        token: tokens_1.usdcToken,
                    },
                    {
                        type: types_1.TransferType.Receive,
                        from: address,
                        to: address,
                        assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
                        totalValue: '50920184',
                        components: [{ value: '50920184' }],
                        token: tokens_1.usdcToken,
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
    describe('erc20', () => {
        it('should be able to parse approve mempool', async () => {
            const { txMempool } = erc20Approve_1.default;
            const address = '0x7c41fa622f047Ee8259A2fd05928A4103fE9b6d6';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.gnosisChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
                data: {
                    assetId: 'eip155:100/erc20:0x4b1e2c2762667331bc91648052f646d1b0d35984',
                    method: 'approve',
                    parser: 'erc20',
                    value: '827880491152360692',
                },
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse approve', async () => {
            const { tx } = erc20Approve_1.default;
            const address = '0x7c41fa622f047Ee8259A2fd05928A4103fE9b6d6';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.gnosisChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.gnosisAssetId,
                    value: '160596000000000',
                },
                transfers: [],
                data: {
                    assetId: 'eip155:100/erc20:0x4b1e2c2762667331bc91648052f646d1b0d35984',
                    method: 'approve',
                    parser: 'erc20',
                    value: '827880491152360692',
                },
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
});

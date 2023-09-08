"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("../../../../types");
const index_1 = require("../../index");
const index_2 = require("../index");
const bep20Approve_1 = __importDefault(require("./mockData/bep20Approve"));
const bep721_1 = __importDefault(require("./mockData/bep721"));
const bep1155_1 = __importDefault(require("./mockData/bep1155"));
const bnbSelfSend_1 = __importDefault(require("./mockData/bnbSelfSend"));
const bnbStandard_1 = __importDefault(require("./mockData/bnbStandard"));
const tokens_1 = require("./mockData/tokens");
const tokenSelfSend_1 = __importDefault(require("./mockData/tokenSelfSend"));
const tokenStandard_1 = __importDefault(require("./mockData/tokenStandard"));
const zrxTradeBnbToBusd_1 = __importDefault(require("./mockData/zrxTradeBnbToBusd"));
const zrxTradeBusdToBnb_1 = __importDefault(require("./mockData/zrxTradeBusdToBnb"));
const zrxTradeUsdtToBusd_1 = __importDefault(require("./mockData/zrxTradeUsdtToBusd"));
const mockedApi = jest.mocked(new index_1.V1Api());
const tokenMetadata = {
    name: 'Foxy',
    description: 'The foxiest Fox',
    media: { url: 'http://foxy.fox', type: 'image' },
};
mockedApi.getTokenMetadata = jest.fn().mockResolvedValue(tokenMetadata);
const txParser = new index_2.TransactionParser({
    rpcUrl: '',
    chainId: caip_1.bscChainId,
    assetId: caip_1.bscAssetId,
    api: mockedApi,
});
describe('parseTx', () => {
    describe('standard', () => {
        describe('bnb', () => {
            it('should be able to parse bnb mempool send', async () => {
                const { txMempool } = bnbStandard_1.default;
                const address = '0xC480394241c76F3993ec5D121ce4F198f7844443';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f',
                            from: address,
                            assetId: caip_1.bscAssetId,
                            totalValue: '1200000000000000000',
                            components: [{ value: '1200000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse bnb send', async () => {
                const { tx } = bnbStandard_1.default;
                const address = '0xC480394241c76F3993ec5D121ce4F198f7844443';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.bscAssetId,
                        value: '105000000000000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f',
                            from: address,
                            assetId: caip_1.bscAssetId,
                            totalValue: '1200000000000000000',
                            components: [{ value: '1200000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse bnb mempool receive', async () => {
                const { txMempool } = bnbStandard_1.default;
                const address = '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xC480394241c76F3993ec5D121ce4F198f7844443',
                            assetId: caip_1.bscAssetId,
                            totalValue: '1200000000000000000',
                            components: [{ value: '1200000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse bnb receive', async () => {
                const { tx } = bnbStandard_1.default;
                const address = '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xC480394241c76F3993ec5D121ce4F198f7844443',
                            assetId: caip_1.bscAssetId,
                            totalValue: '1200000000000000000',
                            components: [{ value: '1200000000000000000' }],
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
                const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token send', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.bscAssetId,
                        value: '180936150000000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            from: address,
                            to: '0xC66bfff5C2ec26F60542bD3C862d7846F0783fdf',
                            assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
                            totalValue: '200000000000000000000',
                            components: [{ value: '200000000000000000000' }],
                            token: tokens_1.usdtToken,
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token mempool receive', async () => {
                const { txMempool } = tokenStandard_1.default;
                const address = '0xC66bfff5C2ec26F60542bD3C862d7846F0783fdf';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token receive', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0xC66bfff5C2ec26F60542bD3C862d7846F0783fdf';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.bscChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            from: '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44',
                            to: address,
                            assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
                            totalValue: '200000000000000000000',
                            components: [{ value: '200000000000000000000' }],
                            token: tokens_1.usdtToken,
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
        });
        describe('bep721', () => {
            it('should be able to parse mempool send', async () => {
                const { txMempool } = bep721_1.default;
                const address = '0xc86d6a700B82C62A14458858d17d0e6a3942f424';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = bep721_1.default;
                const address = '0xc86d6a700B82C62A14458858d17d0e6a3942f424';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.bscAssetId,
                        value: '201048000000000',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '6201612': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x26bCA820c78DDe0349960457960e7b80548E37e3',
                            from: address,
                            assetId: 'eip155:56/bep721:0xd7c79abeb8d8b21e7638a8aadfdcc1438d24b483/6201612',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '6201612',
                            token: {
                                contract: '0xd7C79AbEb8d8B21e7638A8aADfdcC1438d24B483',
                                decimals: 18,
                                name: 'TAP FANTASY SKIN',
                                symbol: 'TFSKIN',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = bep721_1.default;
                const address = '0x26bCA820c78DDe0349960457960e7b80548E37e3';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = bep721_1.default;
                const address = '0x26bCA820c78DDe0349960457960e7b80548E37e3';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '6201612': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xc86d6a700B82C62A14458858d17d0e6a3942f424',
                            assetId: 'eip155:56/bep721:0xd7c79abeb8d8b21e7638a8aadfdcc1438d24b483/6201612',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '6201612',
                            token: {
                                contract: '0xd7C79AbEb8d8B21e7638A8aADfdcC1438d24B483',
                                decimals: 18,
                                name: 'TAP FANTASY SKIN',
                                symbol: 'TFSKIN',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
        });
        describe('bep1155', () => {
            it('should be able to parse mempool send', async () => {
                const { txMempool } = bep1155_1.default;
                const address = '0x606a712666DD5EeF29d2F0360874C8ED1E72A007';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = bep1155_1.default;
                const address = '0x606a712666DD5EeF29d2F0360874C8ED1E72A007';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.bscAssetId,
                        value: '209277000000000',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '550': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0xD3106B990148CFED6D36eaC4E2066B9356dB423b',
                            from: address,
                            assetId: 'eip155:56/bep1155:0xe4395bd1dae0687dcf6bfbafdaa8edb5a2065eef/550',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '550',
                            token: {
                                contract: '0xE4395bD1Dae0687dcF6BfBaFdaa8edB5a2065Eef',
                                decimals: 18,
                                name: 'Nfterrium Nomad',
                                symbol: 'NTMN',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = bep1155_1.default;
                const address = '0xD3106B990148CFED6D36eaC4E2066B9356dB423b';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = bep1155_1.default;
                const address = '0xD3106B990148CFED6D36eaC4E2066B9356dB423b';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:56',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '550': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x606a712666DD5EeF29d2F0360874C8ED1E72A007',
                            assetId: 'eip155:56/bep1155:0xe4395bd1dae0687dcf6bfbafdaa8edb5a2065eef/550',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '550',
                            token: {
                                contract: '0xE4395bD1Dae0687dcF6BfBaFdaa8edB5a2065Eef',
                                decimals: 18,
                                name: 'Nfterrium Nomad',
                                symbol: 'NTMN',
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
        it('should be able to parse bnb mempool', async () => {
            const { txMempool } = bnbSelfSend_1.default;
            const address = '0xC480394241c76F3993ec5D121ce4F198f7844443';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.bscChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.bscAssetId,
                        totalValue: '1200000000000000000',
                        components: [{ value: '1200000000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.bscAssetId,
                        totalValue: '1200000000000000000',
                        components: [{ value: '1200000000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse bnb', async () => {
            const { tx } = bnbSelfSend_1.default;
            const address = '0xC480394241c76F3993ec5D121ce4F198f7844443';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.bscChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.bscAssetId,
                    value: '105000000000000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.bscAssetId,
                        totalValue: '1200000000000000000',
                        components: [{ value: '1200000000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.bscAssetId,
                        totalValue: '1200000000000000000',
                        components: [{ value: '1200000000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token mempool', async () => {
            const { txMempool } = tokenSelfSend_1.default;
            const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.bscChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token', async () => {
            const { tx } = tokenSelfSend_1.default;
            const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.bscChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.bscAssetId,
                    value: '180936150000000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: address,
                        assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
                        totalValue: '200000000000000000000',
                        components: [{ value: '200000000000000000000' }],
                        token: tokens_1.usdtToken,
                    },
                    {
                        type: types_1.TransferType.Receive,
                        from: address,
                        to: address,
                        assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
                        totalValue: '200000000000000000000',
                        components: [{ value: '200000000000000000000' }],
                        token: tokens_1.usdtToken,
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
    describe('bep20', () => {
        it('should be able to parse approve mempool', async () => {
            const { txMempool } = bep20Approve_1.default;
            const address = '0xeFcdFc962cf71Da4D147aA42A72C106d557Ae7Fe';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.bscChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
                data: {
                    assetId: 'eip155:56/bep20:0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    method: 'approve',
                    parser: 'bep20',
                    value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
                },
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse approve', async () => {
            const { tx } = bep20Approve_1.default;
            const address = '0xeFcdFc962cf71Da4D147aA42A72C106d557Ae7Fe';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.bscChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.bscAssetId,
                    value: '221320000000000',
                },
                transfers: [],
                data: {
                    assetId: 'eip155:56/bep20:0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    method: 'approve',
                    parser: 'bep20',
                    value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
                },
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
    describe('zrx trade', () => {
        it('should be able to parse token -> bnb', async () => {
            const { tx } = zrxTradeBusdToBnb_1.default;
            const address = '0x1bE0Db7727c53b16a22af5Cb12F4680e784cf7eF';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const buyTransfer = {
                assetId: caip_1.bscAssetId,
                components: [{ value: '4904343838640863' }],
                from: index_2.ZRX_BSC_PROXY_CONTRACT,
                to: address,
                totalValue: '4904343838640863',
                type: types_1.TransferType.Receive,
            };
            const sellTransfer = {
                assetId: 'eip155:56/bep20:0xe9e7cea3dedca5984780bafc599bd69add087d56',
                components: [{ value: '1489033385864185057' }],
                from: address,
                to: '0x51e6D27FA57373d8d4C256231241053a70Cb1d93',
                token: tokens_1.busdToken,
                totalValue: '1489033385864185057',
                type: types_1.TransferType.Send,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.bscChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '467445000000000',
                    assetId: caip_1.bscAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse bnb -> token', async () => {
            const { tx } = zrxTradeBnbToBusd_1.default;
            const address = '0xb8687c5f88399b0E70DD69F2fBd2200957cDaf38';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const buyTransfer = {
                assetId: 'eip155:56/bep20:0xe9e7cea3dedca5984780bafc599bd69add087d56',
                components: [{ value: '326087208829856917029' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                token: tokens_1.busdToken,
                totalValue: '326087208829856917029',
                type: types_1.TransferType.Receive,
            };
            const sellTransfer = {
                assetId: caip_1.bscAssetId,
                components: [{ value: '1077638000000000000' }],
                from: address,
                to: index_2.ZRX_BSC_PROXY_CONTRACT,
                totalValue: '1077638000000000000',
                type: types_1.TransferType.Send,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.bscChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '1200110000000000',
                    assetId: caip_1.bscAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse token -> token', async () => {
            const { tx } = zrxTradeUsdtToBusd_1.default;
            const address = '0xba599D1526952c14779e6A9D31D912C6A02f5B9C';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const buyTransfer = {
                assetId: 'eip155:56/bep20:0xe9e7cea3dedca5984780bafc599bd69add087d56',
                components: [{ value: '1918012446944444331677' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                token: tokens_1.busdToken,
                totalValue: '1918012446944444331677',
                type: types_1.TransferType.Receive,
            };
            const sellTransfer = {
                assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
                components: [{ value: '1917821751000000000000' }],
                from: address,
                to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                token: tokens_1.usdtToken,
                totalValue: '1917821751000000000000',
                type: types_1.TransferType.Send,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.bscChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '1283480000000000',
                    assetId: caip_1.bscAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
    });
});

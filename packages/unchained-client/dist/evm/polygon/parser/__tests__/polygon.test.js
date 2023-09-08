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
const maticSelfSend_1 = __importDefault(require("./mockData/maticSelfSend"));
const maticStandard_1 = __importDefault(require("./mockData/maticStandard"));
const tokens_1 = require("./mockData/tokens");
const tokenSelfSend_1 = __importDefault(require("./mockData/tokenSelfSend"));
const tokenStandard_1 = __importDefault(require("./mockData/tokenStandard"));
const zrxTradeMaticToUsdc_1 = __importDefault(require("./mockData/zrxTradeMaticToUsdc"));
const zrxTradeUsdcToMatic_1 = __importDefault(require("./mockData/zrxTradeUsdcToMatic"));
const zrxTradeUsdcToUsdt_1 = __importDefault(require("./mockData/zrxTradeUsdcToUsdt"));
const mockedApi = jest.mocked(new index_1.V1Api());
const tokenMetadata = {
    name: 'Foxy',
    description: 'The foxiest Fox',
    media: { url: 'http://foxy.fox', type: 'image' },
};
mockedApi.getTokenMetadata = jest.fn().mockResolvedValue(tokenMetadata);
const txParser = new index_2.TransactionParser({
    rpcUrl: '',
    chainId: caip_1.polygonChainId,
    assetId: caip_1.polygonAssetId,
    api: mockedApi,
});
describe('parseTx', () => {
    describe('standard', () => {
        describe('matic', () => {
            it('should be able to parse matic mempool send', async () => {
                const { txMempool } = maticStandard_1.default;
                const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77',
                            from: address,
                            assetId: caip_1.polygonAssetId,
                            totalValue: '4079513530000000000',
                            components: [{ value: '4079513530000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse matic send', async () => {
                const { tx } = maticStandard_1.default;
                const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.polygonAssetId,
                        value: '5618286173997000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77',
                            from: address,
                            assetId: caip_1.polygonAssetId,
                            totalValue: '4079513530000000000',
                            components: [{ value: '4079513530000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse matic mempool receive', async () => {
                const { txMempool } = maticStandard_1.default;
                const address = '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xC070A61D043189D99bbf4baA58226bf0991c7b11',
                            assetId: caip_1.polygonAssetId,
                            totalValue: '4079513530000000000',
                            components: [{ value: '4079513530000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse matic receive', async () => {
                const { tx } = maticStandard_1.default;
                const address = '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xC070A61D043189D99bbf4baA58226bf0991c7b11',
                            assetId: caip_1.polygonAssetId,
                            totalValue: '4079513530000000000',
                            components: [{ value: '4079513530000000000' }],
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
                const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token send', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.polygonAssetId,
                        value: '12798989060278680',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            from: address,
                            to: '0xaE5f1D2309272557a4f2a3C954f51aF12104A2Ce',
                            assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                            totalValue: '700000000',
                            components: [{ value: '700000000' }],
                            token: tokens_1.usdcToken,
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token mempool receive', async () => {
                const { txMempool } = tokenStandard_1.default;
                const address = '0xaE5f1D2309272557a4f2a3C954f51aF12104A2Ce';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token receive', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0xaE5f1D2309272557a4f2a3C954f51aF12104A2Ce';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.polygonChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            from: '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b',
                            to: address,
                            assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                            totalValue: '700000000',
                            components: [{ value: '700000000' }],
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
                const address = '0x841c64caDA7837e48463Cb022d93f33D1f63356c';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc721_1.default;
                const address = '0x841c64caDA7837e48463Cb022d93f33D1f63356c';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.polygonAssetId,
                        value: '12631422480372220',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '289167': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0xD8D534C68B52A1ae7Af3BB0Bc6C51E97e9007F0F',
                            from: address,
                            assetId: 'eip155:137/erc721:0xa4b37be40f7b231ee9574c4b16b7ddb7eacdc99b/289167',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '289167',
                            token: {
                                contract: '0xA4B37bE40F7b231Ee9574c4b16b7DDb7EAcDC99B',
                                decimals: 18,
                                name: 'Objekt',
                                symbol: 'OBJEKT',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = erc721_1.default;
                const address = '0xD8D534C68B52A1ae7Af3BB0Bc6C51E97e9007F0F';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc721_1.default;
                const address = '0xD8D534C68B52A1ae7Af3BB0Bc6C51E97e9007F0F';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '289167': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x841c64caDA7837e48463Cb022d93f33D1f63356c',
                            assetId: 'eip155:137/erc721:0xa4b37be40f7b231ee9574c4b16b7ddb7eacdc99b/289167',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '289167',
                            token: {
                                contract: '0xA4B37bE40F7b231Ee9574c4b16b7DDb7EAcDC99B',
                                decimals: 18,
                                name: 'Objekt',
                                symbol: 'OBJEKT',
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
                const address = '0xf877411aF8c079fdF69468101fa6723702bc0b20';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc1155_1.default;
                const address = '0xf877411aF8c079fdF69468101fa6723702bc0b20';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.polygonAssetId,
                        value: '9111117137219334',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '1': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x2D76998A35A933BA8213B1B6924DBe25dF98BcFE',
                            from: address,
                            assetId: 'eip155:137/erc1155:0xc934f270079741fb66f19e1cf16267078c5a8394/1',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '1',
                            token: {
                                contract: '0xc934F270079741fB66F19e1CF16267078C5a8394',
                                decimals: 18,
                                name: 'BK',
                                symbol: 'Broker NFT',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = erc1155_1.default;
                const address = '0x2D76998A35A933BA8213B1B6924DBe25dF98BcFE';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc1155_1.default;
                const address = '0x2D76998A35A933BA8213B1B6924DBe25dF98BcFE';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:137',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '1': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xf877411aF8c079fdF69468101fa6723702bc0b20',
                            assetId: 'eip155:137/erc1155:0xc934f270079741fb66f19e1cf16267078c5a8394/1',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '1',
                            token: {
                                contract: '0xc934F270079741fB66F19e1CF16267078C5a8394',
                                decimals: 18,
                                name: 'BK',
                                symbol: 'Broker NFT',
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
        it('should be able to parse matic mempool', async () => {
            const { txMempool } = maticSelfSend_1.default;
            const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.polygonAssetId,
                        totalValue: '4079513530000000000',
                        components: [{ value: '4079513530000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.polygonAssetId,
                        totalValue: '4079513530000000000',
                        components: [{ value: '4079513530000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse matic', async () => {
            const { tx } = maticSelfSend_1.default;
            const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.polygonAssetId,
                    value: '5618286173997000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.polygonAssetId,
                        totalValue: '4079513530000000000',
                        components: [{ value: '4079513530000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.polygonAssetId,
                        totalValue: '4079513530000000000',
                        components: [{ value: '4079513530000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token mempool', async () => {
            const { txMempool } = tokenSelfSend_1.default;
            const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token', async () => {
            const { tx } = tokenSelfSend_1.default;
            const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.polygonAssetId,
                    value: '12798989060278680',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: address,
                        assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                        totalValue: '700000000',
                        components: [{ value: '700000000' }],
                        token: tokens_1.usdcToken,
                    },
                    {
                        type: types_1.TransferType.Receive,
                        from: address,
                        to: address,
                        assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                        totalValue: '700000000',
                        components: [{ value: '700000000' }],
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
            const address = '0x526fE73a7B21cB7A16b277b2d067B2C8478e5249';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
                data: {
                    assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                    method: 'approve',
                    parser: 'erc20',
                    value: '1051800000',
                },
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse approve', async () => {
            const { tx } = erc20Approve_1.default;
            const address = '0x526fE73a7B21cB7A16b277b2d067B2C8478e5249';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.polygonAssetId,
                    value: '14285788388942070',
                },
                transfers: [],
                data: {
                    assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                    method: 'approve',
                    parser: 'erc20',
                    value: '1051800000',
                },
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
    describe('zrx trade', () => {
        it('should be able to parse matic -> token', async () => {
            const { tx } = zrxTradeMaticToUsdc_1.default;
            const address = '0x244E3290b263cb89506D09A4E692EDA9e6a4536e';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const sellTransfer = {
                assetId: caip_1.polygonAssetId,
                components: [{ value: '6982000000000000000' }],
                from: address,
                to: index_2.ZRX_POLYGON_PROXY_CONTRACT,
                totalValue: '6982000000000000000',
                type: types_1.TransferType.Send,
            };
            const buyTransfer = {
                assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                components: [{ value: '8091180' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                token: tokens_1.usdcToken,
                totalValue: '8091180',
                type: types_1.TransferType.Receive,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '73889132778766292',
                    assetId: caip_1.polygonAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse token -> matic', async () => {
            const { tx } = zrxTradeUsdcToMatic_1.default;
            const address = '0xD2d75fAB0c3aABb355e825A0819805dfC7b60036';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const sellTransfer = {
                assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                components: [{ value: '553874000' }],
                from: address,
                to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                token: tokens_1.usdcToken,
                totalValue: '553874000',
                type: types_1.TransferType.Send,
            };
            const buyTransfer = {
                assetId: caip_1.polygonAssetId,
                components: [{ value: '500436721291789495553' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                totalValue: '500436721291789495553',
                type: types_1.TransferType.Receive,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '56842042908977284',
                    assetId: caip_1.polygonAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse token -> token', async () => {
            const { tx } = zrxTradeUsdcToUsdt_1.default;
            const address = '0x46E0F76F12CC05AB3232503429741195dF52f3BC';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const sellTransfer = {
                assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                components: [{ value: '15100000' }],
                from: address,
                to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                token: tokens_1.usdcToken,
                totalValue: '15100000',
                type: types_1.TransferType.Send,
            };
            const buyTransfer = {
                assetId: 'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
                components: [{ value: '15092185' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                token: tokens_1.usdtToken,
                totalValue: '15092185',
                type: types_1.TransferType.Receive,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.polygonChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '73878411661814366',
                    assetId: caip_1.polygonAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
    });
});

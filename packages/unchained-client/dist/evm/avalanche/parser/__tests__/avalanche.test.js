"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("../../../../types");
const index_1 = require("../../index");
const index_2 = require("../index");
const avaxSelfSend_1 = __importDefault(require("./mockData/avaxSelfSend"));
const avaxStandard_1 = __importDefault(require("./mockData/avaxStandard"));
const erc20Approve_1 = __importDefault(require("./mockData/erc20Approve"));
const erc721_1 = __importDefault(require("./mockData/erc721"));
const erc1155_1 = __importDefault(require("./mockData/erc1155"));
const tokens_1 = require("./mockData/tokens");
const tokenSelfSend_1 = __importDefault(require("./mockData/tokenSelfSend"));
const tokenStandard_1 = __importDefault(require("./mockData/tokenStandard"));
const zrxTradeAvaxToWeth_1 = __importDefault(require("./mockData/zrxTradeAvaxToWeth"));
const zrxTradeWethToAvax_1 = __importDefault(require("./mockData/zrxTradeWethToAvax"));
const zrxTradeWethToWbtc_1 = __importDefault(require("./mockData/zrxTradeWethToWbtc"));
const mockedApi = jest.mocked(new index_1.V1Api());
const tokenMetadata = {
    name: 'Foxy',
    description: 'The foxiest Fox',
    media: { url: 'http://foxy.fox', type: 'image' },
};
mockedApi.getTokenMetadata = jest.fn().mockResolvedValue(tokenMetadata);
const txParser = new index_2.TransactionParser({
    rpcUrl: '',
    chainId: caip_1.avalancheChainId,
    assetId: caip_1.avalancheAssetId,
    api: mockedApi,
});
describe('parseTx', () => {
    describe('standard', () => {
        describe('avax', () => {
            it('should be able to parse avax mempool send', async () => {
                const { txMempool } = avaxStandard_1.default;
                const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x744d17684Cb717daAA3530c9840c7501BB29fAD0',
                            from: address,
                            assetId: caip_1.avalancheAssetId,
                            totalValue: '6350190000000000000',
                            components: [{ value: '6350190000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse avax send', async () => {
                const { tx } = avaxStandard_1.default;
                const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.avalancheAssetId,
                        value: '573508559337000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x744d17684Cb717daAA3530c9840c7501BB29fAD0',
                            from: address,
                            assetId: caip_1.avalancheAssetId,
                            totalValue: '6350190000000000000',
                            components: [{ value: '6350190000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse avax mempool receive', async () => {
                const { txMempool } = avaxStandard_1.default;
                const address = '0x744d17684Cb717daAA3530c9840c7501BB29fAD0';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
                            assetId: caip_1.avalancheAssetId,
                            totalValue: '6350190000000000000',
                            components: [{ value: '6350190000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse avax receive', async () => {
                const { tx } = avaxStandard_1.default;
                const address = '0x744d17684Cb717daAA3530c9840c7501BB29fAD0';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
                            assetId: caip_1.avalancheAssetId,
                            totalValue: '6350190000000000000',
                            components: [{ value: '6350190000000000000' }],
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
                const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token send', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.avalancheAssetId,
                        value: '1736704000000000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            from: address,
                            to: '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df',
                            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
                            totalValue: '143199292',
                            components: [{ value: '143199292' }],
                            token: tokens_1.usdcToken,
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token mempool receive', async () => {
                const { txMempool } = tokenStandard_1.default;
                const address = '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token receive', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.avalancheChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            from: '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b',
                            to: address,
                            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
                            totalValue: '143199292',
                            components: [{ value: '143199292' }],
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
                const address = '0x1CE7E58d621124E3478D227751D5672AeeF7F87d';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc721_1.default;
                const address = '0x1CE7E58d621124E3478D227751D5672AeeF7F87d';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.avalancheAssetId,
                        value: '12197872615144426',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '34': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x64813357113500b9829Fd47956E6fa58EbB56f66',
                            from: address,
                            assetId: 'eip155:43114/erc721:0x7b2f2b117d8c291eba87b797b1936e29abd3b118/34',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '34',
                            token: {
                                contract: '0x7b2f2B117D8c291Eba87B797B1936e29aBd3b118',
                                decimals: 18,
                                name: 'Badass Babes',
                                symbol: 'BBABES',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = erc721_1.default;
                const address = '0x64813357113500b9829Fd47956E6fa58EbB56f66';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc721_1.default;
                const address = '0x64813357113500b9829Fd47956E6fa58EbB56f66';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '34': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x1CE7E58d621124E3478D227751D5672AeeF7F87d',
                            assetId: 'eip155:43114/erc721:0x7b2f2b117d8c291eba87b797b1936e29abd3b118/34',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '34',
                            token: {
                                contract: '0x7b2f2B117D8c291Eba87B797B1936e29aBd3b118',
                                decimals: 18,
                                name: 'Badass Babes',
                                symbol: 'BBABES',
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
                const address = '0xD9e686e69131E4068a3dd381F4C4cafe3759AE3F';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc1155_1.default;
                const address = '0xD9e686e69131E4068a3dd381F4C4cafe3759AE3F';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.avalancheAssetId,
                        value: '8660269633799979',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '690': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x0219985aF43434a342eec137141247333A275F30',
                            from: address,
                            assetId: 'eip155:43114/erc1155:0xa695ea0c90d89a1463a53fa7a02168bc46fbbf7e/690',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '690',
                            token: {
                                contract: '0xa695ea0C90D89a1463A53Fa7a02168Bc46FbBF7e',
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
                const address = '0x0219985aF43434a342eec137141247333A275F30';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc1155_1.default;
                const address = '0x0219985aF43434a342eec137141247333A275F30';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:43114',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '690': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xD9e686e69131E4068a3dd381F4C4cafe3759AE3F',
                            assetId: 'eip155:43114/erc1155:0xa695ea0c90d89a1463a53fa7a02168bc46fbbf7e/690',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '690',
                            token: {
                                contract: '0xa695ea0C90D89a1463A53Fa7a02168Bc46FbBF7e',
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
        it('should be able to parse avax mempool', async () => {
            const { txMempool } = avaxSelfSend_1.default;
            const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.avalancheAssetId,
                        totalValue: '6350190000000000000',
                        components: [{ value: '6350190000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.avalancheAssetId,
                        totalValue: '6350190000000000000',
                        components: [{ value: '6350190000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse avax', async () => {
            const { tx } = avaxSelfSend_1.default;
            const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.avalancheAssetId,
                    value: '573508559337000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.avalancheAssetId,
                        totalValue: '6350190000000000000',
                        components: [{ value: '6350190000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.avalancheAssetId,
                        totalValue: '6350190000000000000',
                        components: [{ value: '6350190000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token mempool', async () => {
            const { txMempool } = tokenSelfSend_1.default;
            const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token', async () => {
            const { tx } = tokenSelfSend_1.default;
            const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.avalancheAssetId,
                    value: '1736704000000000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: address,
                        assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
                        totalValue: '143199292',
                        components: [{ value: '143199292' }],
                        token: tokens_1.usdcToken,
                    },
                    {
                        type: types_1.TransferType.Receive,
                        from: address,
                        to: address,
                        assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
                        totalValue: '143199292',
                        components: [{ value: '143199292' }],
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
            const address = '0xA82a74B86fE11FB430Ce7A529C37efAd82ea222d';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
                data: {
                    assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
                    method: 'approve',
                    parser: 'erc20',
                    value: '108516271',
                },
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse approve', async () => {
            const { tx } = erc20Approve_1.default;
            const address = '0xA82a74B86fE11FB430Ce7A529C37efAd82ea222d';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.avalancheAssetId,
                    value: '1645985000000000',
                },
                transfers: [],
                data: {
                    assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
                    method: 'approve',
                    parser: 'erc20',
                    value: '108516271',
                },
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
    describe('zrx trade', () => {
        it('should be able to parse token -> avax', async () => {
            const { tx } = zrxTradeWethToAvax_1.default;
            const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const buyTransfer = {
                assetId: caip_1.avalancheAssetId,
                components: [{ value: '1419200313588432512' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                totalValue: '1419200313588432512',
                type: types_1.TransferType.Receive,
            };
            const sellTransfer = {
                assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
                components: [{ value: '20000000000000000' }],
                from: address,
                to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                token: tokens_1.wrappedEther,
                totalValue: '20000000000000000',
                type: types_1.TransferType.Send,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '6626525000000000',
                    assetId: caip_1.avalancheAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse avax -> token', async () => {
            const { tx } = zrxTradeAvaxToWeth_1.default;
            const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const buyTransfer = {
                assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
                components: [{ value: '819115016056635' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                token: tokens_1.wrappedEther,
                totalValue: '819115016056635',
                type: types_1.TransferType.Receive,
            };
            const sellTransfer = {
                assetId: caip_1.avalancheAssetId,
                components: [{ value: '50000000000000000' }],
                from: address,
                to: index_2.ZRX_AVALANCHE_PROXY_CONTRACT,
                totalValue: '50000000000000000',
                type: types_1.TransferType.Send,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '6346125000000000',
                    assetId: caip_1.avalancheAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse token -> token', async () => {
            const { tx } = zrxTradeWethToWbtc_1.default;
            const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const buyTransfer = {
                assetId: 'eip155:43114/erc20:0x50b7545627a5162f82a992c33b87adc75187b218',
                components: [{ value: '14605' }],
                from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                to: address,
                token: tokens_1.wrappedBitcoin,
                totalValue: '14605',
                type: types_1.TransferType.Receive,
            };
            const sellTransfer = {
                assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
                components: [{ value: '2000000000000000' }],
                from: address,
                to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
                token: tokens_1.wrappedEther,
                totalValue: '2000000000000000',
                type: types_1.TransferType.Send,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.avalancheChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '8329875000000000',
                    assetId: caip_1.avalancheAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
    });
});

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
const ethSelfSend_1 = __importDefault(require("./mockData/ethSelfSend"));
const ethStandard_1 = __importDefault(require("./mockData/ethStandard"));
const tokens_1 = require("./mockData/tokens");
const tokenSelfSend_1 = __importDefault(require("./mockData/tokenSelfSend"));
const tokenStandard_1 = __importDefault(require("./mockData/tokenStandard"));
const zrxTradeEthToUsdc_1 = __importDefault(require("./mockData/zrxTradeEthToUsdc"));
const zrxTradeOpToEth_1 = __importDefault(require("./mockData/zrxTradeOpToEth"));
const zrxTradeUsdcToOp_1 = __importDefault(require("./mockData/zrxTradeUsdcToOp"));
const mockedApi = jest.mocked(new index_1.V1Api());
const tokenMetadata = {
    name: 'Foxy',
    description: 'The foxiest Fox',
    media: { url: 'http://foxy.fox', type: 'image' },
};
mockedApi.getTokenMetadata = jest.fn().mockResolvedValue(tokenMetadata);
const txParser = new index_2.TransactionParser({
    rpcUrl: '',
    chainId: caip_1.optimismChainId,
    assetId: caip_1.optimismAssetId,
    api: mockedApi,
});
describe('parseTx', () => {
    describe('standard', () => {
        describe('eth', () => {
            it('should be able to parse eth mempool send', async () => {
                const { txMempool } = ethStandard_1.default;
                const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.optimismChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0xCA312Fe911B72d2D68F27838b01f359a7b05C567',
                            from: address,
                            assetId: caip_1.optimismAssetId,
                            totalValue: '15000000000000000',
                            components: [{ value: '15000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse eth send', async () => {
                const { tx } = ethStandard_1.default;
                const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.optimismChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.optimismAssetId,
                        value: '2100000000000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0xCA312Fe911B72d2D68F27838b01f359a7b05C567',
                            from: address,
                            assetId: caip_1.optimismAssetId,
                            totalValue: '15000000000000000',
                            components: [{ value: '15000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse eth mempool receive', async () => {
                const { txMempool } = ethStandard_1.default;
                const address = '0xCA312Fe911B72d2D68F27838b01f359a7b05C567';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.optimismChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
                            assetId: caip_1.optimismAssetId,
                            totalValue: '15000000000000000',
                            components: [{ value: '15000000000000000' }],
                        },
                    ],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse eth receive', async () => {
                const { tx } = ethStandard_1.default;
                const address = '0xCA312Fe911B72d2D68F27838b01f359a7b05C567';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.optimismChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
                            assetId: caip_1.optimismAssetId,
                            totalValue: '15000000000000000',
                            components: [{ value: '15000000000000000' }],
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
                const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: caip_1.optimismChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token send', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.optimismChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.optimismAssetId,
                        value: '57124000000',
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            from: address,
                            to: '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50',
                            assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
                            totalValue: '19908484999999999942',
                            components: [{ value: '19908484999999999942' }],
                            token: tokens_1.opToken,
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
                    chainId: caip_1.optimismChainId,
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(expected).toEqual(actual);
            });
            it('should be able to parse token receive', async () => {
                const { tx } = tokenStandard_1.default;
                const address = '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: caip_1.optimismChainId,
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            from: '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA',
                            to: address,
                            assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
                            totalValue: '19908484999999999942',
                            components: [{ value: '19908484999999999942' }],
                            token: tokens_1.opToken,
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
                const address = '0xd861415F6703ab50Ce101C7E6f6A80ada1FC2B1c';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:10',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc721_1.default;
                const address = '0xd861415F6703ab50Ce101C7E6f6A80ada1FC2B1c';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:10',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.optimismAssetId,
                        value: '893340935236256',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '374481': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0x5411894842e610C4D0F6Ed4C232DA689400f94A1',
                            from: address,
                            assetId: 'eip155:10/erc721:0xc36442b4a4522e871399cd717abdd847ab11fe88/374481',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '374481',
                            token: {
                                contract: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
                                decimals: 18,
                                name: 'Uniswap V3 Positions NFT-V1',
                                symbol: 'UNI-V3-POS',
                            },
                        },
                    ],
                };
                const actual = await txParser.parse(tx, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse mempool receive', async () => {
                const { txMempool } = erc721_1.default;
                const address = '0x5411894842e610C4D0F6Ed4C232DA689400f94A1';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:10',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc721_1.default;
                const address = '0x5411894842e610C4D0F6Ed4C232DA689400f94A1';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:10',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    data: {
                        parser: 'nft',
                        mediaById: { '374481': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Receive,
                            to: address,
                            from: '0xd861415F6703ab50Ce101C7E6f6A80ada1FC2B1c',
                            assetId: 'eip155:10/erc721:0xc36442b4a4522e871399cd717abdd847ab11fe88/374481',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '374481',
                            token: {
                                contract: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
                                decimals: 18,
                                name: 'Uniswap V3 Positions NFT-V1',
                                symbol: 'UNI-V3-POS',
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
                const address = '0x7467bE2dC905d2aEfE2068F3bc249F388C2b3456';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:10',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse send', async () => {
                const { tx } = erc1155_1.default;
                const address = '0x7467bE2dC905d2aEfE2068F3bc249F388C2b3456';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:10',
                    confirmations: tx.confirmations,
                    status: types_1.TxStatus.Confirmed,
                    fee: {
                        assetId: caip_1.optimismAssetId,
                        value: '382286869498280',
                    },
                    data: {
                        parser: 'nft',
                        mediaById: { '1': tokenMetadata.media },
                    },
                    transfers: [
                        {
                            type: types_1.TransferType.Send,
                            to: '0xDa3605D79BC9e6dDef9bC8166C922cf7fd7C01a0',
                            from: address,
                            assetId: 'eip155:10/erc1155:0x2f05e799c61b600c65238a9df060caba63db8e78/1',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '1',
                            token: {
                                contract: '0x2f05e799C61b600c65238a9DF060cABA63Db8E78',
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
                const address = '0xDa3605D79BC9e6dDef9bC8166C922cf7fd7C01a0';
                const expected = {
                    txid: txMempool.txid,
                    blockHeight: txMempool.blockHeight,
                    blockTime: txMempool.timestamp,
                    address,
                    chainId: 'eip155:10',
                    confirmations: txMempool.confirmations,
                    status: types_1.TxStatus.Pending,
                    transfers: [],
                };
                const actual = await txParser.parse(txMempool, address);
                expect(actual).toEqual(expected);
            });
            it('should be able to parse receive', async () => {
                const { tx } = erc1155_1.default;
                const address = '0xDa3605D79BC9e6dDef9bC8166C922cf7fd7C01a0';
                const expected = {
                    txid: tx.txid,
                    blockHash: tx.blockHash,
                    blockHeight: tx.blockHeight,
                    blockTime: tx.timestamp,
                    address,
                    chainId: 'eip155:10',
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
                            from: '0x7467bE2dC905d2aEfE2068F3bc249F388C2b3456',
                            assetId: 'eip155:10/erc1155:0x2f05e799c61b600c65238a9df060caba63db8e78/1',
                            totalValue: '1',
                            components: [{ value: '1' }],
                            id: '1',
                            token: {
                                contract: '0x2f05e799C61b600c65238a9DF060cABA63Db8E78',
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
        it('should be able to parse eth mempool', async () => {
            const { txMempool } = ethSelfSend_1.default;
            const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.optimismAssetId,
                        totalValue: '15000000000000000',
                        components: [{ value: '15000000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.optimismAssetId,
                        totalValue: '15000000000000000',
                        components: [{ value: '15000000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse eth', async () => {
            const { tx } = ethSelfSend_1.default;
            const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.optimismAssetId,
                    value: '2100000000000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        to: address,
                        from: address,
                        assetId: caip_1.optimismAssetId,
                        totalValue: '15000000000000000',
                        components: [{ value: '15000000000000000' }],
                    },
                    {
                        type: types_1.TransferType.Receive,
                        to: address,
                        from: address,
                        assetId: caip_1.optimismAssetId,
                        totalValue: '15000000000000000',
                        components: [{ value: '15000000000000000' }],
                    },
                ],
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token mempool', async () => {
            const { txMempool } = tokenSelfSend_1.default;
            const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse token', async () => {
            const { tx } = tokenSelfSend_1.default;
            const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.optimismAssetId,
                    value: '57124000000',
                },
                transfers: [
                    {
                        type: types_1.TransferType.Send,
                        from: address,
                        to: address,
                        assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
                        totalValue: '19908484999999999942',
                        components: [{ value: '19908484999999999942' }],
                        token: tokens_1.opToken,
                    },
                    {
                        type: types_1.TransferType.Receive,
                        from: address,
                        to: address,
                        assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
                        totalValue: '19908484999999999942',
                        components: [{ value: '19908484999999999942' }],
                        token: tokens_1.opToken,
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
            const address = '0x0a9f0cad6277A3e7be2C5Fc8912b93A0F6Ac034b';
            const expected = {
                txid: txMempool.txid,
                blockHeight: txMempool.blockHeight,
                blockTime: txMempool.timestamp,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: txMempool.confirmations,
                status: types_1.TxStatus.Pending,
                transfers: [],
                data: {
                    assetId: 'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
                    method: 'approve',
                    parser: 'erc20',
                    value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
                },
            };
            const actual = await txParser.parse(txMempool, address);
            expect(expected).toEqual(actual);
        });
        it('should be able to parse approve', async () => {
            const { tx } = erc20Approve_1.default;
            const address = '0x0a9f0cad6277A3e7be2C5Fc8912b93A0F6Ac034b';
            const expected = {
                txid: tx.txid,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: tx.confirmations,
                status: types_1.TxStatus.Confirmed,
                fee: {
                    assetId: caip_1.optimismAssetId,
                    value: '53403000000',
                },
                transfers: [],
                data: {
                    assetId: 'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
                    method: 'approve',
                    parser: 'erc20',
                    value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
                },
            };
            const actual = await txParser.parse(tx, address);
            expect(expected).toEqual(actual);
        });
    });
    describe('zrx trade', () => {
        it('should be able to parse eth -> token', async () => {
            const { tx } = zrxTradeEthToUsdc_1.default;
            const address = '0x5e2f658E1677b38fF8D5E6B847A4B377F9C80F60';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const sellTransfer = {
                assetId: caip_1.optimismAssetId,
                components: [{ value: '34100000000000000' }],
                from: address,
                to: index_2.ZRX_OPTIMISM_PROXY_CONTRACT,
                token: undefined,
                totalValue: '34100000000000000',
                type: types_1.TransferType.Send,
            };
            const buyTransfer = {
                assetId: 'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
                components: [{ value: '53869470' }],
                from: '0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740',
                to: address,
                token: tokens_1.usdcToken,
                totalValue: '53869470',
                type: types_1.TransferType.Receive,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '357031000000',
                    assetId: caip_1.optimismAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse token -> eth', async () => {
            const { tx } = zrxTradeOpToEth_1.default;
            const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const sellTransfer = {
                assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
                components: [{ value: '500000000000000000' }],
                from: address,
                to: '0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740',
                token: tokens_1.opToken,
                totalValue: '500000000000000000',
                type: types_1.TransferType.Send,
            };
            const buyTransfer = {
                assetId: caip_1.optimismAssetId,
                components: [{ value: '692386565390547' }],
                from: '0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740',
                to: address,
                totalValue: '692386565390547',
                type: types_1.TransferType.Receive,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '571214858294392',
                    assetId: caip_1.optimismAssetId,
                },
                transfers: [sellTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
        it('should be able to parse token -> token', async () => {
            const { tx } = zrxTradeUsdcToOp_1.default;
            const address = '0x6e2E4991eBC00841e10419065c966b613bC4A84B';
            const trade = { dexName: types_1.Dex.Zrx, type: types_1.TradeType.Trade };
            const sellTransfer = {
                assetId: 'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
                components: [{ value: '2451109749' }],
                from: address,
                to: '0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740',
                token: tokens_1.usdcToken,
                totalValue: '2451109749',
                type: types_1.TransferType.Send,
            };
            const refundTransfer = {
                assetId: 'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
                components: [{ value: '2380453' }],
                from: '0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740',
                to: address,
                token: tokens_1.usdcToken,
                totalValue: '2380453',
                type: types_1.TransferType.Receive,
            };
            const buyTransfer = {
                assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
                components: [{ value: '1000111408396873959586' }],
                from: '0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740',
                to: address,
                token: tokens_1.opToken,
                totalValue: '1000111408396873959586',
                type: types_1.TransferType.Receive,
            };
            const expected = {
                txid: tx.txid,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                blockHash: tx.blockHash,
                address,
                chainId: caip_1.optimismChainId,
                confirmations: tx.confirmations,
                data: { parser: 'zrx' },
                status: types_1.TxStatus.Confirmed,
                fee: {
                    value: '1133496000000',
                    assetId: caip_1.optimismAssetId,
                },
                transfers: [sellTransfer, refundTransfer, buyTransfer],
                trade,
            };
            const actual = await txParser.parse(tx, address);
            expect(actual).toEqual(expected);
        });
    });
});

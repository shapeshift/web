import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import type { Trade } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { Api } from '../../..'
import type { ParsedTx } from '../../../parser'
import type { V1Api } from '../../index'
import {
  FOXY_STAKING_CONTRACT,
  UNI_V2_FOX_STAKING_REWARDS_V3,
  WETH_CONTRACT_MAINNET,
} from '../constants'
import { TransactionParser, ZRX_ETHEREUM_PROXY_CONTRACT } from '../index'
import erc721 from './mockData/erc721'
import erc1155 from './mockData/erc1155'
import ethSelfSend from './mockData/ethSelfSend'
import foxClaim from './mockData/foxClaim'
import foxExit from './mockData/foxExit'
import foxStake from './mockData/foxStake'
import foxyClaimWithdraw from './mockData/foxyClaimWithdraw'
import foxyInstantUnstake from './mockData/foxyInstantUnstake'
import foxyStake from './mockData/foxyStake'
import foxyUnstake from './mockData/foxyUnstake'
import multiSigSendEth from './mockData/multiSigSendEth'
import thorSwapDepositEth from './mockData/thorSwapDepositEth'
import thorSwapDepositUsdc from './mockData/thorSwapDepositUsdc'
import thorSwapRefundEth from './mockData/thorSwapRefundEth'
import thorSwapTransferOutEth from './mockData/thorSwapTransferOutEth'
import thorSwapTransferOutUsdc from './mockData/thorSwapTransferOutUsdc'
import {
  bondToken,
  foxToken,
  foxyToken,
  kishuToken,
  maticToken,
  tribeToken,
  uniToken,
  uniV2Token,
  usdcToken,
  usdtToken,
} from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import uniAddLiquidity from './mockData/uniAddLiquidity'
import uniApprove from './mockData/uniApprove'
import uniRemoveLiquidity from './mockData/uniRemoveLiquidity'
import wethDeposit from './mockData/wethDeposit'
import wethWithdraw from './mockData/wethWithdraw'
import zrxTradeBondToUni from './mockData/zrxTradeBondToUni'
import zrxTradeEthToMatic from './mockData/zrxTradeEthToMatic'
import zrxTradeTetherToKishu from './mockData/zrxTradeTetherToKishu'
import zrxTradeTribeToEth from './mockData/zrxTradeTribeToEth'

const mocks = vi.hoisted(() => {
  const tokenMetadata: evm.TokenMetadata = {
    name: 'Foxy',
    description: 'The foxiest Fox',
    media: { url: 'http://foxy.fox', type: 'image' },
  }
  return {
    api: {
      getTokenMetadata: vi.fn().mockResolvedValue({ tokenMetadata }),
    },
    tokenMetadata,
    get: vi.fn(() => {
      return Promise.resolve({ data: undefined })
    }),
    post: vi.fn(),
  }
})

const getApi = vi.hoisted(async () => {
  const actual = await vi.importActual<{ V1Api: typeof V1Api }>('../../index')
  const v1Api = vi.mocked(new actual.V1Api())
  const tokenMetadata = mocks.tokenMetadata
  v1Api.getTokenMetadata = vi.fn().mockResolvedValue(tokenMetadata)

  return v1Api
})

vi.hoisted(() => {
  vi.stubEnv('REACT_APP_FEATURE_NFT_METADATA', 'true')
})

vi.mock('axios', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    default: mockAxios.default.create(),
  }
})
const makeTxParser = vi.fn(
  async () =>
    new TransactionParser({
      rpcUrl: '',
      chainId: ethChainId,
      assetId: ethAssetId,
      api: (await getApi) as unknown as Api,
    }),
)

describe('parseTx', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  describe('standard', () => {
    describe('erc721', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = erc721
        const address = '0xa5d981BC0Bc57500ffEDb2674c597F14a3Cb68c1'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc721
        const address = '0xa5d981BC0Bc57500ffEDb2674c597F14a3Cb68c1'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: ethAssetId,
            value: '5974629016703985',
          },
          data: {
            parser: 'nft',
            mediaById: { '2253': mocks.tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x86c6B7f9D91D104e53F2Be608549F0Dc6ECABb57',
              from: address,
              assetId: 'eip155:1/erc721:0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e/2253',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '2253',
              token: {
                contract: '0x68d0F6d1d99Bb830E17fFaA8aDB5BbeD9D6EEc2E',
                decimals: 18,
                name: 'Diamond Exhibition',
                symbol: 'DIAMOND',
              },
            },
          ],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc721
        const address = '0x86c6B7f9D91D104e53F2Be608549F0Dc6ECABb57'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc721
        const address = '0x86c6B7f9D91D104e53F2Be608549F0Dc6ECABb57'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '2253': mocks.tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xa5d981BC0Bc57500ffEDb2674c597F14a3Cb68c1',
              assetId: 'eip155:1/erc721:0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e/2253',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '2253',
              token: {
                contract: '0x68d0F6d1d99Bb830E17fFaA8aDB5BbeD9D6EEc2E',
                decimals: 18,
                name: 'Diamond Exhibition',
                symbol: 'DIAMOND',
              },
            },
          ],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })

    describe('erc1155', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = erc1155
        const address = '0x63acA79298884a520776B5bE662230a37de4a327'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc1155
        const address = '0x63acA79298884a520776B5bE662230a37de4a327'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: ethAssetId,
            value: '28797509921536974',
          },
          data: {
            parser: 'nft',
            mediaById: { '2': mocks.tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x3A3548e060Be10c2614d0a4Cb0c03CC9093fD799',
              from: address,
              assetId: 'eip155:1/erc1155:0x3b287c39ed2812a4c87521301c9c56577b5bdd8d/2',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '2',
              token: {
                contract: '0x3b287C39ed2812A4C87521301c9C56577b5Bdd8D',
                decimals: 18,
                name: 'Rene Distort',
                symbol: 'RENDIS',
              },
            },
          ],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc1155
        const address = '0x3A3548e060Be10c2614d0a4Cb0c03CC9093fD799'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc1155
        const address = '0x3A3548e060Be10c2614d0a4Cb0c03CC9093fD799'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:1',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '2': mocks.tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x63acA79298884a520776B5bE662230a37de4a327',
              assetId: 'eip155:1/erc1155:0x3b287c39ed2812a4c87521301c9c56577b5bdd8d/2',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '2',
              token: {
                contract: '0x3b287C39ed2812A4C87521301c9C56577b5Bdd8D',
                decimals: 18,
                name: 'Rene Distort',
                symbol: 'RENDIS',
              },
            },
          ],
        }

        const txParser = await makeTxParser()
        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })
  })

  describe('multiSig', () => {
    it('should be able to parse eth multi sig send', async () => {
      const { tx } = multiSigSendEth
      const address = '0x76DA1578aC163CA7ca4143B7dEAa428e85Db3042'

      const standardTransfer = {
        assetId: 'eip155:1/slip44:60',
        components: [{ value: '1201235000000000000' }],
        from: '0x79fE68B3e4Bc2B91a4C8dfFb5317C7B8813d8Ae7',
        to: '0x76DA1578aC163CA7ca4143B7dEAa428e85Db3042',
        token: undefined,
        totalValue: '1201235000000000000',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: undefined,
        status: TxStatus.Confirmed,
        transfers: [standardTransfer],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('thor', () => {
    it('should be able to parse eth deposit', async () => {
      const { tx } = thorSwapDepositEth
      const address = '0xCeb660E7623E8f8312B3379Df747c35f2217b595'
      const trade: Trade = {
        dexName: Dex.Thor,
        memo: 'SWAP:THOR.RUNE:thor19f3dsgetxzssvdmqnplfep5fe42fsrvq9u87ax:',
        type: TradeType.Trade,
      }
      const sellTransfer = {
        assetId: 'eip155:1/slip44:60',
        components: [{ value: '295040000000000000' }],
        from: '0xCeb660E7623E8f8312B3379Df747c35f2217b595',
        to: '0xC145990E84155416144C532E31f89B840Ca8c2cE',
        totalValue: '295040000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'deposit',
          parser: 'thor',
        },
        status: TxStatus.Confirmed,
        fee: {
          assetId: 'eip155:1/slip44:60',
          value: '1700235000000000',
        },
        transfers: [sellTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token deposit', async () => {
      const { tx } = thorSwapDepositUsdc
      const address = '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E'
      const trade: Trade = {
        dexName: Dex.Thor,
        memo: 'SWAP:THOR.RUNE:thor1hhjupkzy3t6ccelhz7qw8epyx4rm8a06nlm5ce:110928642111',
        type: TradeType.Trade,
      }
      const sellTransfer = {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        components: [{ value: '16598881497' }],
        from: '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E',
        to: '0xC145990E84155416144C532E31f89B840Ca8c2cE',
        token: usdcToken,
        totalValue: '16598881497',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'deposit',
          parser: 'thor',
        },
        status: TxStatus.Confirmed,
        fee: {
          assetId: 'eip155:1/slip44:60',
          value: '4700280000000000',
        },
        transfers: [sellTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth transfer out', async () => {
      const { tx } = thorSwapTransferOutEth
      const address = '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E'
      const trade: Trade = {
        dexName: Dex.Thor,
        memo: 'OUT:8C859BA50BC2351797F52F954971E1C6BA1F0A77610AC197BD99C4EEC6A3692A',
        type: TradeType.Trade,
      }
      const buyTransfer = {
        assetId: 'eip155:1/slip44:60',
        components: [{ value: '1579727090000000000' }],
        from: '0xC145990E84155416144C532E31f89B840Ca8c2cE',
        to: '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E',
        token: undefined,
        totalValue: '1579727090000000000',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'transferOut',
          parser: 'thor',
        },
        status: TxStatus.Confirmed,
        transfers: [buyTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token transfer out', async () => {
      const { tx } = thorSwapTransferOutUsdc
      const address = '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E'
      const trade: Trade = {
        dexName: Dex.Thor,
        memo: 'OUT:F3AC4E90AB5951AB9FEB1715B481422B904A40B0F6753CC844E326B1213CF70E',
        type: TradeType.Trade,
      }
      const buyTransfer = {
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        components: [{ value: '47596471640' }],
        from: '0xC145990E84155416144C532E31f89B840Ca8c2cE',
        to: '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E',
        token: usdcToken,
        totalValue: '47596471640',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'transferOut',
          parser: 'thor',
        },
        status: TxStatus.Confirmed,
        transfers: [buyTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth refund', async () => {
      const { tx } = thorSwapRefundEth
      const address = '0xfc0Cc6E85dFf3D75e3985e0CB83B090cfD498dd1'
      const trade: Trade = {
        dexName: Dex.Thor,
        memo: 'REFUND:851B4997CF8F9FBA806B3780E0C178CCB173AE78E3FD5056F7375B059B22BD3A',
        type: TradeType.Refund,
      }
      const buyTransfer = {
        assetId: 'eip155:1/slip44:60',
        components: [{ value: '6412730000000000' }],
        from: '0xC145990E84155416144C532E31f89B840Ca8c2cE',
        to: '0xfc0Cc6E85dFf3D75e3985e0CB83B090cfD498dd1',
        token: undefined,
        totalValue: '6412730000000000',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'transferOut',
          parser: 'thor',
        },
        status: TxStatus.Confirmed,
        transfers: [buyTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('zrx', () => {
    it('should be able to parse token -> eth', async () => {
      const { tx } = zrxTradeTribeToEth
      const address = '0x5bb96c35a68Cba037D0F261C67477416db137F03'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer = {
        assetId: 'eip155:1/slip44:60',
        components: [{ value: '541566754246167133' }],
        from: ZRX_ETHEREUM_PROXY_CONTRACT,
        to: address,
        totalValue: '541566754246167133',
        type: TransferType.Receive,
      }

      const sellTransfer = {
        assetId: 'eip155:1/erc20:0xc7283b66eb1eb5fb86327f08e1b5816b0720212b',
        components: [{ value: '1000000000000000000000' }],
        from: address,
        to: '0x7ce01885a13c652241aE02Ea7369Ee8D466802EB',
        token: tribeToken,
        totalValue: '1000000000000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '8308480000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth -> token', async () => {
      const { tx } = zrxTradeEthToMatic
      const address = '0x564BcA365D62BCC22dB53d032F8dbD35439C9206'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer = {
        assetId: 'eip155:1/erc20:0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
        components: [{ value: '50000000000000000000000' }],
        from: '0x22F9dCF4647084d6C31b2765F6910cd85C178C18',
        to: address,
        token: maticToken,
        totalValue: '50000000000000000000000',
        type: TransferType.Receive,
      }

      const sellTransfer = {
        assetId: 'eip155:1/slip44:60',
        components: [{ value: '10000000000000000000' }],
        from: address,
        to: ZRX_ETHEREUM_PROXY_CONTRACT,
        totalValue: '10000000000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '19815285000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token', async () => {
      const { tx } = zrxTradeTetherToKishu
      const address = '0xb8b19c048296E086DaF69F54d48dE2Da444dB047'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer = {
        type: TransferType.Receive,
        from: '0xF82d8Ec196Fb0D56c6B82a8B1870F09502A49F88',
        to: address,
        assetId: 'eip155:1/erc20:0xa2b4c0af19cc16a6cfacce81f192b024d625817d',
        totalValue: '9248567698016204727450',
        components: [{ value: '9248567698016204727450' }],
        token: kishuToken,
      }

      const sellTransfer = {
        type: TransferType.Send,
        from: address,
        to: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852',
        assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
        totalValue: '45000000000',
        components: [{ value: '45000000000' }],
        token: usdtToken,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '78183644000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token (multiple swaps)', async () => {
      const { tx } = zrxTradeBondToUni
      const address = '0x986bB494db49E6f1CDC1be098e3157f8DDC5a821'
      const trade: Trade = {
        dexName: Dex.Zrx,
        type: TradeType.Trade,
      }

      const buyTransfer1 = {
        type: TransferType.Receive,
        from: '0xEBFb684dD2b01E698ca6c14F10e4f289934a54D6',
        to: address,
        assetId: 'eip155:1/erc20:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        totalValue: '56639587020747520629',
        components: [{ value: '56639587020747520629' }],
        token: uniToken,
      }

      const buyTransfer2 = {
        type: TransferType.Receive,
        from: '0xd3d2E2692501A5c9Ca623199D38826e513033a17',
        to: address,
        assetId: 'eip155:1/erc20:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        totalValue: '47448670568188553620',
        components: [{ value: '47448670568188553620' }],
        token: uniToken,
      }

      const sellTransfer1 = {
        type: TransferType.Send,
        from: address,
        to: '0x6591c4BcD6D7A1eb4E537DA8B78676C1576Ba244',
        assetId: 'eip155:1/erc20:0x0391d2021f89dc339f60fff84546ea23e337750f',
        totalValue: '53910224825217010944',
        components: [{ value: '53910224825217010944' }],
        token: bondToken,
      }

      const sellTransfer2 = {
        type: TransferType.Send,
        from: address,
        to: '0xB17B1342579e4bcE6B6e9A426092EA57d33843D9',
        assetId: 'eip155:1/erc20:0x0391d2021f89dc339f60fff84546ea23e337750f',
        totalValue: '46089775174782989056',
        components: [{ value: '46089775174782989056' }],
        token: bondToken,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: undefined,
          parser: 'zrx',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '18399681000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [sellTransfer1, buyTransfer1, sellTransfer2, buyTransfer2],
        trade,
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('self send', () => {
    it('should be able to parse eth mempool', async () => {
      const { txMempool } = ethSelfSend
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: txMempool.confirmations,
        data: undefined,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: 'eip155:1/slip44:60',
            totalValue: '503100000000000',
            components: [{ value: '503100000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: 'eip155:1/slip44:60',
            totalValue: '503100000000000',
            components: [{ value: '503100000000000' }],
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(txMempool, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth', async () => {
      const { tx } = ethSelfSend
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: undefined,
        status: TxStatus.Confirmed,
        fee: {
          value: '399000000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:1/slip44:60',
            totalValue: '503100000000000',
            components: [{ value: '503100000000000' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:1/slip44:60',
            totalValue: '503100000000000',
            components: [{ value: '503100000000000' }],
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: txMempool.confirmations,
        data: undefined,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            totalValue: '1502080',
            components: [{ value: '1502080' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            totalValue: '1502080',
            components: [{ value: '1502080' }],
            token: usdcToken,
          },
        ],
      }
      const txParser = await makeTxParser()

      const actual = await txParser.parse(txMempool, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: undefined,
        status: TxStatus.Confirmed,
        fee: {
          value: '1011738000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            totalValue: '1502080',
            components: [{ value: '1502080' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            totalValue: '1502080',
            components: [{ value: '1502080' }],
            token: usdcToken,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('uniswap', () => {
    it('should be able to parse approve', async () => {
      const { tx } = uniApprove
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
          method: 'approve',
          parser: 'erc20',
          value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        },
        status: TxStatus.Confirmed,
        trade: undefined,
        fee: {
          value: '1447243200000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse add liquidity mempool', async () => {
      const { txMempool } = uniAddLiquidity
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: txMempool.confirmations,
        data: {
          method: 'addLiquidityETH',
          parser: 'uniV2',
        },
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '100000000000000000000',
            components: [{ value: '100000000000000000000' }],
            token: {
              contract: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
              decimals: 18,
              name: 'FOX',
              symbol: 'FOX',
            },
          },
          {
            type: TransferType.Send,
            from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            assetId: 'eip155:1/slip44:60',
            totalValue: '42673718176645189',
            components: [{ value: '42673718176645189' }],
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(txMempool, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse add liquidity', async () => {
      const { tx } = uniAddLiquidity
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'addLiquidityETH',
          parser: 'uniV2',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '26926494400000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            assetId: 'eip155:1/slip44:60',
            totalValue: '42673718176645189',
            components: [{ value: '42673718176645189' }],
          },
          {
            type: TransferType.Send,
            from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '100000000000000000000',
            components: [{ value: '100000000000000000000' }],
            token: foxToken,
          },
          {
            type: TransferType.Receive,
            from: '0x0000000000000000000000000000000000000000',
            to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
            totalValue: '1888842410762840601',
            components: [{ value: '1888842410762840601' }],
            token: uniV2Token,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse remove liquidity mempool', async () => {
      const { txMempool } = uniRemoveLiquidity
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: txMempool.confirmations,
        data: {
          method: 'removeLiquidityETH',
          parser: 'uniV2',
        },
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
            assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
            totalValue: '298717642142382954',
            components: [{ value: '298717642142382954' }],
            token: uniV2Token,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(txMempool, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse remove liquidity', async () => {
      const { tx } = uniRemoveLiquidity
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'removeLiquidityETH',
          parser: 'uniV2',
        },
        status: TxStatus.Confirmed,
        trade: undefined,
        fee: {
          value: '4082585000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            to: '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c',
            assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
            totalValue: '298717642142382954',
            components: [{ value: '298717642142382954' }],
            token: uniV2Token,
          },
          {
            type: TransferType.Receive,
            from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '15785079906515930982',
            components: [{ value: '15785079906515930982' }],
            token: foxToken,
          },
          {
            type: TransferType.Receive,
            from: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            to: '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C',
            assetId: 'eip155:1/slip44:60',
            totalValue: '6761476182340434',
            components: [{ value: '6761476182340434' }],
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('fox', () => {
    it('should be able to parse claim', async () => {
      const { tx } = foxClaim
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: undefined,
        status: TxStatus.Confirmed,
        fee: {
          value: '2559843000000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [
          {
            type: TransferType.Receive,
            from: '0x02FfdC5bfAbe5c66BE067ff79231585082CA5fe2',
            to: address,
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '1500000000000000000000',
            components: [{ value: '1500000000000000000000' }],
            token: foxToken,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse stake mempool', async () => {
      const { txMempool } = foxStake
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: txMempool.confirmations,
        data: {
          method: 'stake',
          parser: 'uniV2',
        },
        status: TxStatus.Pending,
        transfers: [],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(txMempool, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse stake', async () => {
      const { tx } = foxStake
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'stake',
          parser: 'uniV2',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '4650509500000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: UNI_V2_FOX_STAKING_REWARDS_V3,
            assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
            totalValue: '99572547380794318',
            components: [{ value: '99572547380794318' }],
            token: uniV2Token,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse exit mempool', async () => {
      const { txMempool } = foxExit
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: 'eip155:1',
        confirmations: txMempool.confirmations,
        data: {
          method: 'exit',
          parser: 'uniV2',
        },
        status: TxStatus.Pending,
        transfers: [],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(txMempool, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse exit', async () => {
      const { tx } = foxExit
      const address = '0x6bF198c2B5c8E48Af4e876bc2173175b89b1DA0C'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'exit',
          parser: 'uniV2',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '6136186875000000',
          assetId: 'eip155:1/slip44:60',
        },
        transfers: [
          {
            type: TransferType.Receive,
            from: UNI_V2_FOX_STAKING_REWARDS_V3,
            to: address,
            assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
            totalValue: '531053586030903030',
            components: [{ value: '531053586030903030' }],
            token: uniV2Token,
          },
          {
            type: TransferType.Receive,
            from: UNI_V2_FOX_STAKING_REWARDS_V3,
            to: address,
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '317669338073988',
            components: [{ value: '317669338073988' }],
            token: foxToken,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('foxy', () => {
    it('should be able to parse stake', async () => {
      const { tx } = foxyStake
      const address = '0xCBa38513451bCE398A87F9950a154034Cad59cE9'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'stake',
          parser: 'foxy',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '8343629232016788',
          assetId: 'eip155:1/slip44:60',
        },
        trade: undefined,
        transfers: [
          {
            type: TransferType.Send,
            to: FOXY_STAKING_CONTRACT,
            from: address,
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '109548875260073394762',
            components: [{ value: '109548875260073394762' }],
            token: foxToken,
          },
          {
            type: TransferType.Receive,
            to: address,
            from: FOXY_STAKING_CONTRACT,
            assetId: 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
            totalValue: '109548875260073394762',
            components: [{ value: '109548875260073394762' }],
            token: foxyToken,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse unstake', async () => {
      const { tx } = foxyUnstake
      const address = '0x557C61Ec8F7A675BE03EFe11962430ac8Cff4229'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'unstake',
          parser: 'foxy',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '7586577934107040',
          assetId: 'eip155:1/slip44:60',
        },
        trade: undefined,
        transfers: [
          {
            type: TransferType.Send,
            to: FOXY_STAKING_CONTRACT,
            from: address,
            assetId: 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
            totalValue: '24292579090466512304',
            components: [{ value: '24292579090466512304' }],
            token: foxyToken,
          },
          {
            type: TransferType.Receive,
            to: address,
            from: FOXY_STAKING_CONTRACT,
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '22438383781076552673',
            components: [{ value: '22438383781076552673' }],
            token: foxToken,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse instant unstake', async () => {
      const { tx } = foxyInstantUnstake
      const address = '0x1f41A6429D2035035253859f6edBd6438Ecf5d39'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'instantUnstake',
          parser: 'foxy',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '10348720598973963',
          assetId: 'eip155:1/slip44:60',
        },
        trade: undefined,
        transfers: [
          {
            type: TransferType.Send,
            to: FOXY_STAKING_CONTRACT,
            from: address,
            assetId: 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
            totalValue: '9885337259647255313',
            components: [{ value: '9885337259647255313' }],
            token: foxyToken,
          },
          {
            type: TransferType.Receive,
            to: address,
            from: '0x8EC637Fe2800940C7959f9BAd4fE69e41225CD39',
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '9638203828156073931',
            components: [{ value: '9638203828156073931' }],
            token: foxToken,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse claim withdraw', async () => {
      const { tx } = foxyClaimWithdraw
      const address = '0x55FB947880EE0660C90bC2055748aD70956FbE3c'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'claimWithdraw',
          parser: 'foxy',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '4735850597827293',
          assetId: 'eip155:1/slip44:60',
        },
        trade: undefined,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: FOXY_STAKING_CONTRACT,
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            totalValue: '1200000000000000000000',
            components: [{ value: '1200000000000000000000' }],
            token: foxToken,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('weth', () => {
    it('should be able to parse deposit', async () => {
      const { tx } = wethDeposit
      const address = '0x2D801972327b0F11422d9Cc14A3d00B07ae0CceB'
      const contractAddress = WETH_CONTRACT_MAINNET

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'deposit',
          parser: 'weth',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '2161334514900778',
          assetId: 'eip155:1/slip44:60',
        },
        trade: undefined,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: contractAddress,
            assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            totalValue: '30000000000000000',
            components: [{ value: '30000000000000000' }],
            token: {
              contract: contractAddress,
              decimals: 18,
              name: 'Wrapped Ether',
              symbol: 'WETH',
            },
          },
          {
            assetId: 'eip155:1/slip44:60',
            components: [{ value: '30000000000000000' }],
            from: address,
            to: contractAddress,
            token: undefined,
            totalValue: '30000000000000000',
            type: TransferType.Send,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse deposit extra input data', async () => {
      const { tx2 } = wethDeposit
      const address = '0xE7F92E3d5FDe63C90A917e25854826873497ef3D'
      const contractAddress = WETH_CONTRACT_MAINNET

      const expected: ParsedTx = {
        txid: tx2.txid,
        blockHeight: tx2.blockHeight,
        blockTime: tx2.timestamp,
        blockHash: tx2.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx2.confirmations,
        data: {
          method: 'deposit',
          parser: 'weth',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '1087028000000000',
          assetId: 'eip155:1/slip44:60',
        },
        trade: undefined,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: contractAddress,
            assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            totalValue: '3264000000000000',
            components: [{ value: '3264000000000000' }],
            token: {
              contract: contractAddress,
              decimals: 18,
              name: 'Wrapped Ether',
              symbol: 'WETH',
            },
          },
          {
            assetId: 'eip155:1/slip44:60',
            components: [{ value: '3264000000000000' }],
            from: address,
            to: contractAddress,
            token: undefined,
            totalValue: '3264000000000000',
            type: TransferType.Send,
          },
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx2, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse withdrawal', async () => {
      const { tx } = wethWithdraw
      const address = '0xa6F15FB2cc5dC96c2EBA18c101AD3fAD27F74839'
      const contractAddress = WETH_CONTRACT_MAINNET

      const internalTransfer = {
        assetId: 'eip155:1/slip44:60',
        components: [{ value: '100000000000000000' }],
        from: contractAddress,
        to: address,
        token: undefined,
        totalValue: '100000000000000000',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: 'eip155:1',
        confirmations: tx.confirmations,
        data: {
          method: 'withdraw',
          parser: 'weth',
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '1482222626533792',
          assetId: 'eip155:1/slip44:60',
        },
        trade: undefined,
        transfers: [
          {
            type: TransferType.Send,
            to: contractAddress,
            from: address,
            assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            totalValue: '100000000000000000',
            components: [{ value: '100000000000000000' }],
            token: {
              contract: contractAddress,
              decimals: 18,
              name: 'Wrapped Ether',
              symbol: 'WETH',
            },
          },
          internalTransfer,
        ],
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})

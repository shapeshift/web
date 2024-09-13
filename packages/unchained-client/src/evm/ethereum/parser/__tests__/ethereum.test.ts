import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import {
  FOXY_STAKING_CONTRACT,
  UNI_V2_FOX_STAKING_REWARDS_V3_CONTRACT,
  WETH_TOKEN_CONTRACT,
  ZRX_ETHEREUM_PROXY_CONTRACT,
} from '@shapeshiftoss/contracts'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import type { Trade } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { Api } from '../../..'
import { arbitrumBridgeErc20Claim } from '../../../arbitrum/parser/__tests__/mockData/arbitrumBridgeErc20Claim'
import { arbitrumBridgeErc20DepositTx } from '../../../arbitrum/parser/__tests__/mockData/arbitrumBridgeErc20DepositTx'
import { arbitrumBridgeNativeClaim } from '../../../arbitrum/parser/__tests__/mockData/arbitrumBridgeNativeClaim'
import { arbitrumBridgeNativeCreateRetryableTicketTx } from '../../../arbitrum/parser/__tests__/mockData/arbitrumBridgeNativeCreateRetryableTicketTx'
import { arbitrumBridgeNativeDepositTx } from '../../../arbitrum/parser/__tests__/mockData/arbitrumBridgeNativeDepositTx'
import type { ParsedTx } from '../../../parser'
import type { V1Api } from '../../index'
import { TransactionParser } from '../index'
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
import thorchainLoanOpenEth from './mockData/thorchainLoanOpenEth'
import thorchainLoanOpenOutboundEth from './mockData/thorchainLoanOpenOutboundEth'
import thorchainLoanOpenOutboundToken from './mockData/thorchainLoanOpenOutboundToken'
import thorchainLoanOpenRefundEth from './mockData/thorchainLoanOpenRefundEth'
import thorchainLoanRepaymentEth from './mockData/thorchainLoanRepaymentEth'
import thorchainLoanRepaymentOutboundEth from './mockData/thorchainLoanRepaymentOutboundEth'
import thorchainLoanRepaymentRefundEth from './mockData/thorchainLoanRepaymentRefundEth'
import thorchainLoanRepaymentRefundToken from './mockData/thorchainLoanRepaymentRefundToken'
import thorchainLoanRepaymentToken from './mockData/thorchainLoanRepaymentToken'
import thorchainLpDepositEth from './mockData/thorchainLpDepositEth'
import thorchainLpDepositToken from './mockData/thorchainLpDepositToken'
import thorchainLpOutboundEth from './mockData/thorchainLpOutboundEth'
import thorchainLpOutboundToken from './mockData/thorchainLpOutboundToken'
import thorchainLpRefundEth from './mockData/thorchainLpRefundEth'
import thorchainLpRefundToken from './mockData/thorchainLpRefundToken'
import thorchainLpWithdrawEth from './mockData/thorchainLpWithdrawEth'
import thorchainLpWithdrawToken from './mockData/thorchainLpWithdrawToken'
import thorchainSaversDepositEth from './mockData/thorchainSaversDepositEth'
import thorchainSaversDepositToken from './mockData/thorchainSaversDepositToken'
import thorchainSaversOutboundEth from './mockData/thorchainSaversOutboundEth'
import thorchainSaversOutboundToken from './mockData/thorchainSaversOutboundToken'
import thorchainSaversRefundEth from './mockData/thorchainSaversRefundEth'
import thorchainSaversRefundToken from './mockData/thorchainSaversRefundToken'
import thorchainSaversWithdrawEth from './mockData/thorchainSaversWithdrawEth'
import thorchainSaversWithdrawToken from './mockData/thorchainSaversWithdrawToken'
import thorchainStreamingSwapEth from './mockData/thorchainStreamingSwapEth'
import thorchainStreamingSwapOutboundEth from './mockData/thorchainStreamingSwapOutboundEth'
import thorchainStreamingSwapOutboundToken from './mockData/thorchainStreamingSwapOutboundToken'
import thorchainStreamingSwapRefundEth from './mockData/thorchainStreamingSwapRefundEth'
import thorchainStreamingSwapRefundToken from './mockData/thorchainStreamingSwapRefundToken'
import thorchainStreamingSwapToken from './mockData/thorchainStreamingSwapToken'
import thorchainSwapEth from './mockData/thorchainSwapEth'
import thorchainSwapLongtail from './mockData/thorchainSwapLongtail'
import thorchainSwapOutboundEth from './mockData/thorchainSwapOutboundEth'
import thorchainSwapOutboundLongtail from './mockData/thorchainSwapOutboundLongtail'
import thorchainSwapOutboundToken from './mockData/thorchainSwapOutboundToken'
import thorchainSwapRefundEth from './mockData/thorchainSwapRefundEth'
import thorchainSwapRefundToken from './mockData/thorchainSwapRefundToken'
import thorchainSwapToken from './mockData/thorchainSwapToken'
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
    get: vi.fn(),
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
    create: vi.fn(() => ({
      get: mocks.get,
      post: mocks.post,
    })),
    get: mocks.get,
    post: mocks.post,
  }

  return {
    default: mockAxios,
  }
})

const makeTxParser = vi.fn(
  async () =>
    new TransactionParser({
      api: (await getApi) as unknown as Api,
      assetId: ethAssetId,
      chainId: ethChainId,
      midgardUrl: '',
      rpcUrl: '',
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

  describe('thorchain', () => {
    it('should be able to parse eth swap (deposit)', async () => {
      const { txDeposit: tx } = thorchainSwapEth
      const address = '0xCeb660E7623E8f8312B3379Df747c35f2217b595'
      const memo = 'SWAP:THOR.RUNE:thor19f3dsgetxzssvdmqnplfep5fe42fsrvq9u87ax:'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: tx.value }],
            from: address,
            to: tx.to,
            totalValue: tx.value,
            type: TransferType.Send,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Standard' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth swap (depositWithExpiry)', async () => {
      const { txDepositWithExpiry: tx } = thorchainSwapEth
      const address = '0xA2d3301900e429D29179d3c5c7Cd8d813E8Fbba5'
      const memo = '=:b:3GsSTWcQfbEpMQW4nJ6oPr1UhQZZCS74KD:7415381:t:30'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: tx.value }],
            from: address,
            to: tx.to,
            totalValue: tx.value,
            type: TransferType.Send,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Standard' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth swap outbound', async () => {
      const { tx, actionsResponse } = thorchainSwapOutboundEth
      const address = '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E'
      const memo = 'OUT:8C859BA50BC2351797F52F954971E1C6BA1F0A77610AC197BD99C4EEC6A3692A'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '1579727090000000000' }],
            from: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
            to: address,
            totalValue: '1579727090000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapOut', swap: { type: 'Standard' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth swap refund', async () => {
      const { tx, actionsResponse } = thorchainSwapRefundEth
      const address = '0xfc0Cc6E85dFf3D75e3985e0CB83B090cfD498dd1'
      const memo = 'REFUND:851B4997CF8F9FBA806B3780E0C178CCB173AE78E3FD5056F7375B059B22BD3A'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '6412730000000000' }],
            from: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
            to: address,
            totalValue: '6412730000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapRefund', swap: { type: 'Standard' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token swap', async () => {
      const { tx } = thorchainSwapToken
      const address = '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E'
      const memo = 'SWAP:THOR.RUNE:thor1hhjupkzy3t6ccelhz7qw8epyx4rm8a06nlm5ce:110928642111'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            components: [{ value: '16598881497' }],
            from: address,
            to: tx.to,
            totalValue: '16598881497',
            type: TransferType.Send,
            token: usdcToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Standard' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token swap outbound', async () => {
      const { tx, actionsResponse } = thorchainSwapOutboundToken
      const address = '0x5a8C5afbCC1A58cCbe17542957b587F46828B38E'
      const memo = 'OUT:F3AC4E90AB5951AB9FEB1715B481422B904A40B0F6753CC844E326B1213CF70E'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            components: [{ value: '47596471640' }],
            from: '0x42A5Ed456650a09Dc10EBc6361A7480fDd61f27B',
            to: address,
            totalValue: '47596471640',
            type: TransferType.Receive,
            token: usdcToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapOut', swap: { type: 'Standard' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token swap refund', async () => {
      const { tx, actionsResponse } = thorchainSwapRefundToken
      const address = '0x9c2E658ffC8ea7Fad00A4829Bd4B554e8a716f73'
      const memo = 'REFUND:FEFB84289F49F1878A26A5DC7AA039F45C4D60AC216AACEF1082D99FFFBE3468'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
            components: [{ value: '65391780000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '65391780000000000',
            type: TransferType.Receive,
            token: {
              contract: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
              decimals: 18,
              name: 'yearn.finance',
              symbol: 'YFI',
            },
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapRefund', swap: { type: 'Standard' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth streaming swap', async () => {
      const { tx } = thorchainStreamingSwapEth
      const address = '0xb3305D7Ba0A76b519926E2e203A3cBF80DbA555d'
      const memo = '=:LTC.LTC:ltc1q7k2yhdsacqv6v4rfpp3dzqx538z05qkmcajwg4:0/1/0:ti:70'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '6696393970416121' }],
            from: address,
            to: tx.to,
            totalValue: '6696393970416121',
            type: TransferType.Send,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Streaming' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth streaming swap outbound', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapOutboundEth
      const address = '0x6CC41829d0a67456970529F92d6abACc83d69E61'
      const memo = 'OUT:65A75EE7D50DD30A9A401678E8582441DFCC43C2F0F4B9EC9CB1123A64F6E3DC'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '4300220000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '4300220000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapOut', swap: { type: 'Streaming' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth streaming swap refund', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapRefundEth
      const address = '0xAAA3bFb53d5D5116FAeDc5Dd457531f8465f78af'
      const memo = 'REFUND:9FB10E490AF1B763563CFC12FB08E5F32E387FBB6398884E742BF0178FAD6D88'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '4353475000000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '4353475000000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapRefund', swap: { type: 'Streaming' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token streaming swap', async () => {
      const { tx } = thorchainStreamingSwapToken
      const address = '0xaFEA60C8BfE8D27f95F3e27F84ED6AB2FE409d39'
      const memo = '=:GAIA.ATOM:cosmos1ggd2pw5stl9cx4svme4ak59ynsqtam3q8ephqx:0/1/0:ti:70'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            components: [{ value: '12000000' }],
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            totalValue: '12000000',
            type: TransferType.Send,
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Streaming' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token streaming swap outbound', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapOutboundToken
      const address = '0x02416c573925A104573E00Fc9b7dd5aD83CF37ae'
      const memo = 'OUT:97C882D099B95C89C5F73C0E9F89857C6D7676BB1A74A59618FAA917E28052B6'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            components: [{ value: '159339774' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '159339774',
            type: TransferType.Receive,
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapOut', swap: { type: 'Streaming' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token streaming swap refund', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapRefundToken
      const address = '0x111ae447488df1bfa35C1AC9724b1246e839b0C0'
      const memo = 'REFUND:4A2DA151915B28172E2191C3226BE0AD6A245B02395D676C51ABF31E99DC511B'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
            components: [{ value: '125941190000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '125941190000000000',
            type: TransferType.Receive,
            token: {
              contract: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
              decimals: 18,
              name: 'Wrapped liquid staked Ether 2.0',
              symbol: 'wstETH',
            },
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapRefund', swap: { type: 'Streaming' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth savers deposit', async () => {
      const { tx } = thorchainSaversDepositEth
      const address = '0x912F42653c9aE29346151baE12Eb80281A95aaBe'
      const memo = '+:ETH/ETH::ss:0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0x5C04b555E86507742455b280A4F6436cC43af314',
            assetId: ethAssetId,
            totalValue: '75299305807869161',
            components: [{ value: '75299305807869161' }],
          },
        ],
        data: { parser: 'thorchain', method: 'deposit', memo, liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth savers withdraw', async () => {
      const { tx } = thorchainSaversWithdrawEth
      const address = '0x2e3E405055d7781cB49716726001AaC26d3F6FC8'
      const memo = '-:ETH/ETH:5000'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0x610c97879CD08D54721fD6CDfA143887778AD8c1',
            assetId: ethAssetId,
            totalValue: '10000000000',
            components: [{ value: '10000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'withdraw', memo, liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth savers outbound', async () => {
      const { tx, actionsResponse } = thorchainSaversOutboundEth
      const address = '0x2e3E405055d7781cB49716726001AaC26d3F6FC8'
      const memo = 'OUT:60D4C809FC6B1FE59761203759ECA4EAB8E2EEC90F25593F0DEBF0DAA78CDC36'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '7399090000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '7399090000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'withdrawOut', liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth savers refund', async () => {
      const { tx, actionsResponse } = thorchainSaversRefundEth
      const address = '0xc49066C93521a32135574656573458bE11dBA05B'
      const memo = 'REFUND:8238A7E45925D5A2982B9B72472ED641B710CCB7572AF7B3297999263927D0C4'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '939834410000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '939834410000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'depositRefund', liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token savers deposit', async () => {
      const { tx } = thorchainSaversDepositToken
      const address = '0xee66F9018D253fc335db47214985cf63FCC6e693'
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            totalValue: '2012368190',
            components: [{ value: '2012368190' }],
            token: usdcToken,
          },
        ],
        data: { parser: 'thorchain', method: 'deposit', memo, liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token savers withdraw', async () => {
      const { tx } = thorchainSaversWithdrawToken
      const address = '0x44F87741f17b0fd8079C258F833708a15205BF72'
      const memo = '-:ETH/USDT-ec7:9900'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: ethAssetId,
            totalValue: '10000000000',
            components: [{ value: '10000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'withdraw', memo, liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token savers outbound', async () => {
      const { tx, actionsResponse } = thorchainSaversOutboundToken
      const address = '0x44F87741f17b0fd8079C258F833708a15205BF72'
      const memo = 'OUT:CC5103CBFDC4F24C48DD2C5AECF2C6956613EA3AF6FB74582030DEB6B8FA6298'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            components: [{ value: '2059204899' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '2059204899',
            type: TransferType.Receive,
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'withdrawOut', liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token savers refund', async () => {
      const { tx, actionsResponse } = thorchainSaversRefundToken
      const address = '0xc49066C93521a32135574656573458bE11dBA05B'
      const memo = 'REFUND:8238A7E45925D5A2982B9B72472ED641B710CCB7572AF7B3297999263927D0C4'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            components: [{ value: '2059204899' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '2059204899',
            type: TransferType.Receive,
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'depositRefund', liquidity: { type: 'Savers' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth lp deposit', async () => {
      const { tx } = thorchainLpDepositEth
      const address = '0xAA07f696a5Eb1C3195B353625be29737419931aD'
      const memo = '+:ETH.ETH::t:0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: ethAssetId,
            totalValue: '7000000000000000000',
            components: [{ value: '7000000000000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'deposit', memo, liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth lp withdraw', async () => {
      const { tx } = thorchainLpWithdrawEth
      const address = '0xAA07f696a5Eb1C3195B353625be29737419931aD'
      const memo = '-:ETH.ETH:10000'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: ethAssetId,
            totalValue: '10000000000',
            components: [{ value: '10000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'withdraw', memo, liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth lp outbound', async () => {
      const { tx, actionsResponse } = thorchainLpOutboundEth
      const address = '0xAA07f696a5Eb1C3195B353625be29737419931aD'
      const memo = 'OUT:0A57839F87A8ABC586542C9A7F7E7E4D7D50A8BD1C680AE0C2963F6DC8185C52'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '5312070540000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '5312070540000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'withdrawOut', liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth lp refund', async () => {
      const { tx, actionsResponse } = thorchainLpRefundEth
      const address = '0xc49066C93521a32135574656573458bE11dBA05B'
      const memo = 'REFUND:8238A7E45925D5A2982B9B72472ED641B710CCB7572AF7B3297999263927D0C4'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: ethAssetId,
            components: [{ value: '939834410000000000' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '939834410000000000',
            type: TransferType.Receive,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'depositRefund', liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token lp deposit', async () => {
      const { tx } = thorchainLpDepositToken
      const address = '0xc1a256a031A8D2938e1fa6782cf4a7411f5F0d73'
      const memo = '+:ETH.USDT::wr:100'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            totalValue: '62678661',
            components: [{ value: '62678661' }],
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', method: 'deposit', memo, liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token lp withdraw', async () => {
      const { tx } = thorchainLpWithdrawToken
      const address = '0xc1a256a031A8D2938e1fa6782cf4a7411f5F0d73'
      const memo = '-:ETH.USDT:10000'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: ethAssetId,
            totalValue: '10000000000',
            components: [{ value: '10000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'withdraw', memo, liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token lp outbound', async () => {
      const { tx, actionsResponse } = thorchainLpOutboundToken
      const address = '0xc1a256a031A8D2938e1fa6782cf4a7411f5F0d73'
      const memo = 'OUT:525DC683F3E79A3CD3A512BE76929D1C583952528493C71A9D68DD7ECAEE9019'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            components: [{ value: '105663523' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '105663523',
            type: TransferType.Receive,
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'withdrawOut', liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token lp refund', async () => {
      const { tx, actionsResponse } = thorchainLpRefundToken
      const address = '0xc49066C93521a32135574656573458bE11dBA05B'
      const memo = 'REFUND:8238A7E45925D5A2982B9B72472ED641B710CCB7572AF7B3297999263927D0C4'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            components: [{ value: '2059204899' }],
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            totalValue: '2059204899',
            type: TransferType.Receive,
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', memo, method: 'depositRefund', liquidity: { type: 'LP' } },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth loan open', async () => {
      const { tx } = thorchainLoanOpenEth
      const address = '0x782C14C79945caD46Fbea57bb73d796366e76147'
      const memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::t:0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: ethAssetId,
            totalValue: '5000000000000000',
            components: [{ value: '5000000000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanOpen', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth loan open outbound', async () => {
      const { tx, actionsResponse } = thorchainLoanOpenOutboundEth
      const address = '0x93Ca9d11740794b5E93f65a9AB63C930B1DB1f95'
      const memo = 'OUT:55CDFE3F3A6DC2EFAEE9432CD7DEBDA14309955BCDCDADDE6ED96378B1297185'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            assetId: ethAssetId,
            totalValue: '20948330710000000000',
            components: [{ value: '20948330710000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanOpenOut', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth loan open refund', async () => {
      const { tx, actionsResponse } = thorchainLoanOpenRefundEth
      const address = '0xcc24D4368654599f05b637cdBC935c519a29310c'
      const memo = 'REFUND:C8A08F3B12A3C371E06BBD036050029B5B940C24D2FAD85F112DC2B758B74B1A'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            assetId: ethAssetId,
            totalValue: '4997600000000000000',
            components: [{ value: '4997600000000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanOpenRefund', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth loan repayment', async () => {
      const { tx } = thorchainLoanRepaymentEth
      const address = '0xAe96D15537aFa0ceBc7792C8D4977de6CBf759c5'
      const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: ethAssetId,
            totalValue: '45961550000000000',
            components: [{ value: '45961550000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanRepayment', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth loan repayment outbound', async () => {
      const { tx, actionsResponse } = thorchainLoanRepaymentOutboundEth
      const address = '0x6293Eb0863C083819731eB329940a9b931cd9Cd9'
      const memo = 'OUT:BE469BD2AFE7C5896EDE7D48BAB88FE8ABF8DCE9207AAC04FEBD746A7B43417D'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            assetId: ethAssetId,
            totalValue: '1008315360000000000',
            components: [{ value: '1008315360000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanRepaymentOut', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse eth loan repayment refund', async () => {
      const { tx, actionsResponse } = thorchainLoanRepaymentRefundEth
      const address = '0x2E2F2A4a49b0c936012aF4b67db562fF0e7D10d7'
      const memo = 'REFUND:4DD8EEC829D9B5DC7910D4984272BA963600BA0F537F3ECB565C0BC05F589AE6'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            assetId: ethAssetId,
            totalValue: '305222000000000000',
            components: [{ value: '305222000000000000' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanRepaymentRefund', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token loan open outbound', async () => {
      const { tx, actionsResponse } = thorchainLoanOpenOutboundToken
      const address = '0x0F55f315617869cBF62bdc4f883d8C0AD90Cf63f'
      const memo = 'OUT:C803297230FA11CE9BFE1F2FC2A6A0A534776DF95AED33DF8EDE62BE0FCB266C'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            totalValue: '1300324741',
            components: [{ value: '1300324741' }],
            token: usdcToken,
          },
        ],
        data: { parser: 'thorchain', method: 'loanOpenOut', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token loan repayment', async () => {
      const { tx } = thorchainLoanRepaymentToken
      const address = '0x6293Eb0863C083819731eB329940a9b931cd9Cd9'
      const memo = '$-:ETH.ETH:0x6293eb0863c083819731eb329940a9b931cd9cd9'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
            totalValue: '751706937',
            components: [{ value: '751706937' }],
            token: usdtToken,
          },
        ],
        data: { parser: 'thorchain', method: 'loanRepayment', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token loan repayment refund', async () => {
      const { tx, actionsResponse } = thorchainLoanRepaymentRefundToken
      const address = '0x8a7eAE0fbd128D33022e9d64D912f9903e0f5fcc'
      const memo = 'REFUND:92627113DC24A26A1DA33D9184CA4D0969628D72FB2B3675F01FAAB6EF6E6DE7'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146',
            to: address,
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            totalValue: '110703296',
            components: [{ value: '110703296' }],
            token: usdcToken,
          },
        ],
        data: { parser: 'thorchain', method: 'loanRepaymentRefund', memo },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse longtail swap', async () => {
      const { tx } = thorchainSwapLongtail
      const address = '0x10f6f534449A36489D65eF12A54A324102899479'
      const memo = '=:DOGE.DOGE:D5ZxkWY2dwwjPhUEQBRHcb3wNamft1XGga:654517605534:ss:0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        fee: {
          assetId: ethAssetId,
          value: tx.fee,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0x11733abf0cdb43298f7e949c930188451a9A9Ef2',
            assetId: 'eip155:1/erc20:0xd533a949740bb3306d119cc777fa900ba034cd52',
            totalValue: '1177917668085453396367',
            components: [{ value: '1177917668085453396367' }],
            token: {
              contract: '0xD533a949740bb3306d119CC777fa900bA034cd52',
              decimals: 18,
              name: 'Curve DAO Token',
              symbol: 'CRV',
            },
          },
        ],
        data: { parser: 'thorchain', method: 'swap', memo, swap: { type: 'Standard' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse longtail swap outbound', async () => {
      const { tx, actionsResponse } = thorchainSwapOutboundLongtail
      const address = '0x80AcE046480e13b1dFCc5c7535c2D2d4Da652Fc6'
      const memo = 'OUT:DC9C74908B12B8762E844AB1D143A3AC292D616D38AA5FCF7F8FF6702C21E9FB'

      mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ethChainId,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0x04fa0d235c4abf4bcf4787af4cf447de572ef828',
            components: [{ value: '239486540176872266724' }],
            from: '0x157Dfa656Fdf0D18E1bA94075a53600D81cB3a97',
            to: address,
            totalValue: '239486540176872266724',
            type: TransferType.Receive,
            token: {
              contract: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
              decimals: 18,
              name: 'UMA Voting Token v1',
              symbol: 'UMA',
            },
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swapOut', swap: { type: 'Standard' } },
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
        assetId: 'eip155:1/erc20:0x455e53cbb86018ac2b8092fdcd39d8444affc3f6',
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
            to: UNI_V2_FOX_STAKING_REWARDS_V3_CONTRACT,
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
            from: UNI_V2_FOX_STAKING_REWARDS_V3_CONTRACT,
            to: address,
            assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
            totalValue: '531053586030903030',
            components: [{ value: '531053586030903030' }],
            token: uniV2Token,
          },
          {
            type: TransferType.Receive,
            from: UNI_V2_FOX_STAKING_REWARDS_V3_CONTRACT,
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
      const contractAddress = WETH_TOKEN_CONTRACT

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
      const contractAddress = WETH_TOKEN_CONTRACT

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
      const contractAddress = WETH_TOKEN_CONTRACT

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

  describe('arbitrumBridge', () => {
    it('should be able to parse erc20 deposit', async () => {
      const tx = arbitrumBridgeErc20DepositTx
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
        blockHash: '0xed1bdf1823c6d9fc3f2486d795e79e65fdac065173f13e10fe1fdc11c0afc90d',
        blockHeight: 20146622,
        blockTime: 1719051767,
        chainId: 'eip155:1',
        confirmations: 24456,
        data: {
          assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          method: 'outboundTransferDeposit',
          parser: 'arbitrumBridge',
        },
        fee: {
          assetId: 'eip155:1/slip44:60',
          value: '573646509671922',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [
          {
            assetId: 'eip155:1/slip44:60',
            components: [
              {
                value: '43769826666368',
              },
            ],
            from: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
            id: undefined,
            to: '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef',
            token: undefined,
            totalValue: '43769826666368',
            type: 'Send',
          },
          {
            assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            components: [
              {
                value: '2000000',
              },
            ],
            from: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
            id: undefined,
            to: '0xcEe284F754E854890e311e3280b767F80797180d',
            token: {
              contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              decimals: 6,
              name: 'USD Coin',
              symbol: 'USDC',
            },
            totalValue: '2000000',
            type: 'Send',
          },
        ],
        txid: '0x2b666f87986ed222e45c5299f893258e2468d59068ed36425f26ee2088baeb60',
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse ETH deposit', async () => {
      const tx = arbitrumBridgeNativeDepositTx
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address,
        blockHash: '0x547baea04677590e3c4887cc8ed8d488e383573aee47e32c9308f98e73af4320',
        blockHeight: 19832035,
        blockTime: 1715252267,
        chainId: 'eip155:1',
        confirmations: 330563,
        data: {
          assetId: undefined,
          method: 'depositEth',
          parser: 'arbitrumBridge',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [],
        txid: '0xd115a9c89b5a387fc4da3be84329038e25cb13e36dd054126de9ac9ae3177f19',
      }
      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse ETH create retryable ticket', async () => {
      const tx = arbitrumBridgeNativeCreateRetryableTicketTx
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
        blockHash: '0x612914871278754aa065019e9de359340b6c7b22f5e72d276807d2fc426bddf4',
        blockHeight: 20146557,
        blockTime: 1719050987,
        chainId: 'eip155:1',
        confirmations: 24521,
        data: {
          assetId: undefined,
          method: 'createRetryableTicket',
          parser: 'arbitrumBridge',
        },
        fee: {
          assetId: 'eip155:1/slip44:60',
          value: '302058949978604',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [
          {
            assetId: 'eip155:1/slip44:60',
            components: [
              {
                value: '10013325858196800',
              },
            ],
            from: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
            id: undefined,
            to: '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f',
            token: undefined,
            totalValue: '10013325858196800',
            type: 'Send',
          },
        ],
        txid: '0x75f20f8f2caead042ac63c3175f34e505bc9a388a10b4c4e64a55831ef4d33cf',
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
    it('should be able to parse erc20 claim', async () => {
      const tx = arbitrumBridgeErc20Claim
      const address = '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986'

      const expected = {
        address: '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986',
        blockHash: '0x224eec4d01a99b1cd011bc5e89fd6ddd468e5b9ad1c9658b6ca852e487ee4d2b',
        blockHeight: 20627282,
        blockTime: 1724850443,
        chainId: 'eip155:1',
        confirmations: 918,
        data: {
          assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
          method: 'executeTransaction',
          parser: 'arbitrumBridge',
        },
        fee: {
          assetId: 'eip155:1/slip44:60',
          value: '572048472071840',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [
          {
            assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
            components: [
              {
                value: '1000000000000000000',
              },
            ],
            from: '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC',
            id: undefined,
            to: '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986',
            token: {
              contract: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
              decimals: 18,
              name: 'FOX',
              symbol: 'FOX',
            },
            totalValue: '1000000000000000000',
            type: 'Receive',
          },
        ],
        txid: '0x48bd40a3cac5d25b21d2ae31375f6c273a3fe37f78cfca385e05a948038a1c57',
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
    it('should be able to parse ETH claim', async () => {
      const tx = arbitrumBridgeNativeClaim
      const address = '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986'

      const expected = {
        address: '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986',
        blockHash: '0x22ec673c7bc57087312a368b26abfd183ddb0c19fb225c7c86d15d7d2f3da047',
        blockHeight: 20627308,
        blockTime: 1724850755,
        chainId: 'eip155:1',
        confirmations: 892,
        data: {
          assetId: undefined,
          method: 'executeTransaction',
          parser: 'arbitrumBridge',
        },
        fee: {
          assetId: 'eip155:1/slip44:60',
          value: '369113082579370',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [
          {
            assetId: 'eip155:1/slip44:60',
            components: [
              {
                value: '1000000000000000',
              },
            ],
            from: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a',
            id: undefined,
            to: '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986',
            token: undefined,
            totalValue: '1000000000000000',
            type: 'Receive',
          },
        ],
        txid: '0x88d984a81220fe9d45ec0cdc07c56ad22cb31439ac6d5abfe32c069990d86f56',
      }

      const txParser = await makeTxParser()
      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})

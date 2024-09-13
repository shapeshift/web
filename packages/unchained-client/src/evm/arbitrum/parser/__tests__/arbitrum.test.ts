import { arbitrumAssetId, arbitrumChainId, ethAssetId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { ZRX_ETHEREUM_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { describe, expect, it, vi } from 'vitest'

import type { Trade, Transfer } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { V1Api } from '../../index'
import { TransactionParser } from '../index'
import { arbitrumBridgeErc20GatewayReceive } from './mockData/arbitrumBridgeErc20GatewayReceive'
import { arbitrumBridgeErc20ReceiveTx } from './mockData/arbitrumBridgeErc20ReceiveTx'
import { arbitrumBridgeErc20WithdrawTx } from './mockData/arbitrumBridgeErc20WithdrawTx'
import { arbitrumBridgeNativeReceiveTx } from './mockData/arbitrumBridgeNativeReceiveTx'
import { arbitrumBridgeNativeWithdrawRequest } from './mockData/arbitrumBridgeNativeWithdrawRequest'
import erc20Approve from './mockData/erc20Approve'
import erc721 from './mockData/erc721'
import erc1155 from './mockData/erc1155'
import ethSelfSend from './mockData/ethSelfSend'
import ethStandard from './mockData/ethStandard'
import rfoxSetRuneAddress from './mockData/rfoxSetRuneAddress'
import rfoxStake from './mockData/rfoxStake'
import rfoxUnstake from './mockData/rfoxUnstake'
import rfoxWithdraw from './mockData/rfoxWithdraw'
import { foxToken, usdcToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import zrxTradeEthToUsdc from './mockData/zrxTradeEthToUsdc'
import zrxTradeUsdcToEth from './mockData/zrxTradeUsdcToEth'
import zrxTradeUsdcToWbtc from './mockData/zrxTradeUsdcToWbtc'

vi.hoisted(() => {
  vi.stubEnv('REACT_APP_FEATURE_NFT_METADATA', 'true')
})

const mockedApi = vi.mocked(new V1Api())

const tokenMetadata: evm.TokenMetadata = {
  name: 'Foxy',
  description: 'The foxiest Fox',
  media: { url: 'http://foxy.fox', type: 'image' },
}

mockedApi.getTokenMetadata = vi.fn().mockResolvedValue(tokenMetadata)

const txParser = new TransactionParser({
  rpcUrl: '',
  chainId: arbitrumChainId,
  assetId: arbitrumAssetId,
  api: mockedApi,
})

describe('parseTx', () => {
  describe('standard', () => {
    describe('eth', () => {
      it('should be able to parse eth mempool send', async () => {
        const { txMempool } = ethStandard
        const address = '0x9B258677De08E16D96d2009C3B7DafD584c6D466'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Send,
              to: '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE',
              from: address,
              assetId: arbitrumAssetId,
              totalValue: '642255590800000008',
              components: [{ value: '642255590800000008' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth send', async () => {
        const { tx } = ethStandard
        const address = '0x9B258677De08E16D96d2009C3B7DafD584c6D466'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: arbitrumAssetId,
            value: '79945000000000',
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE',
              from: address,
              assetId: arbitrumAssetId,
              totalValue: '642255590800000008',
              components: [{ value: '642255590800000008' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth mempool receive', async () => {
        const { txMempool } = ethStandard
        const address = '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x9B258677De08E16D96d2009C3B7DafD584c6D466',
              assetId: arbitrumAssetId,
              totalValue: '642255590800000008',
              components: [{ value: '642255590800000008' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth receive', async () => {
        const { tx } = ethStandard
        const address = '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x9B258677De08E16D96d2009C3B7DafD584c6D466',
              assetId: arbitrumAssetId,
              totalValue: '642255590800000008',
              components: [{ value: '642255590800000008' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })
    })

    describe('token', () => {
      it('should be able to parse token mempool send', async () => {
        const { txMempool } = tokenStandard
        const address = '0x3464500CaD953053cDF19DA6175139E6a3Aa2775'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token send', async () => {
        const { tx } = tokenStandard
        const address = '0x3464500CaD953053cDF19DA6175139E6a3Aa2775'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: arbitrumAssetId,
            value: '68640360000000',
          },
          transfers: [
            {
              type: TransferType.Send,
              from: address,
              to: '0x2cbBA5BCF26D37855356F8b5d68e32544Bfde569',
              assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
              totalValue: '129549687',
              components: [{ value: '129549687' }],
              token: usdcToken,
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token mempool receive', async () => {
        const { txMempool } = tokenStandard
        const address = '0x2cbBA5BCF26D37855356F8b5d68e32544Bfde569'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token receive', async () => {
        const { tx } = tokenStandard
        const address = '0x2cbBA5BCF26D37855356F8b5d68e32544Bfde569'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              from: '0x3464500CaD953053cDF19DA6175139E6a3Aa2775',
              to: address,
              assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
              totalValue: '129549687',
              components: [{ value: '129549687' }],
              token: usdcToken,
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })
    })

    describe('erc721', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = erc721
        const address = '0xb92B9e394150781c282B6137695290a4C596DbB2'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc721
        const address = '0xb92B9e394150781c282B6137695290a4C596DbB2'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: arbitrumAssetId,
            value: '88558600000000',
          },
          data: {
            parser: 'nft',
            mediaById: { '1032810': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xf5131C59194F11D9248A8e14c32D5b6f234542f6',
              from: address,
              assetId: 'eip155:42161/erc721:0x1e3e1ed17a8df57c215b45f00c2ec4717b33a93d/1032810',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '1032810',
              token: {
                contract: '0x1E3E1ed17A8Df57C215b45f00c2eC4717B33a93D',
                decimals: 18,
                name: 'DragonMO Token',
                symbol: 'DMO',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc721
        const address = '0xf5131C59194F11D9248A8e14c32D5b6f234542f6'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc721
        const address = '0xf5131C59194F11D9248A8e14c32D5b6f234542f6'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '1032810': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xb92B9e394150781c282B6137695290a4C596DbB2',
              assetId: 'eip155:42161/erc721:0x1e3e1ed17a8df57c215b45f00c2ec4717b33a93d/1032810',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '1032810',
              token: {
                contract: '0x1E3E1ed17A8Df57C215b45f00c2eC4717B33a93D',
                decimals: 18,
                name: 'DragonMO Token',
                symbol: 'DMO',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })

    describe('erc1155', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = erc1155
        const address = '0x51DC8038b19d5E72C003011cB9A58c299058734C'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc1155
        const address = '0x51DC8038b19d5E72C003011cB9A58c299058734C'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: arbitrumAssetId,
            value: '37873900000000',
          },
          data: {
            parser: 'nft',
            mediaById: { '4': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xDddDA6f358EACeB800C82D41CcC53676b5CC6F6c',
              from: address,
              assetId: 'eip155:42161/erc1155:0x6f10a5370dcc90ef77e7ea34742b986509e0018a/4',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '4',
              token: {
                contract: '0x6f10A5370dCC90Ef77e7Ea34742B986509e0018A',
                decimals: 18,
                name: 'Mystery Stone',
                symbol: 'Mystery Stone',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc1155
        const address = '0xDddDA6f358EACeB800C82D41CcC53676b5CC6F6c'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc1155
        const address = '0xDddDA6f358EACeB800C82D41CcC53676b5CC6F6c'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '4': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x51DC8038b19d5E72C003011cB9A58c299058734C',
              assetId: 'eip155:42161/erc1155:0x6f10a5370dcc90ef77e7ea34742b986509e0018a/4',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '4',
              token: {
                contract: '0x6f10A5370dCC90Ef77e7Ea34742B986509e0018A',
                decimals: 18,
                name: 'Mystery Stone',
                symbol: 'Mystery Stone',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })
  })

  describe('self send', () => {
    it('should be able to parse eth mempool', async () => {
      const { txMempool } = ethSelfSend
      const address = '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: arbitrumChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: arbitrumAssetId,
            totalValue: '642255590800000008',
            components: [{ value: '642255590800000008' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: arbitrumAssetId,
            totalValue: '642255590800000008',
            components: [{ value: '642255590800000008' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse matic', async () => {
      const { tx } = ethSelfSend
      const address = '0xEDf4cA2BAE39c3e65e3216985c18ec632193aBAE'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: arbitrumAssetId,
          value: '79945000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: arbitrumAssetId,
            totalValue: '642255590800000008',
            components: [{ value: '642255590800000008' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: arbitrumAssetId,
            totalValue: '642255590800000008',
            components: [{ value: '642255590800000008' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0x3464500CaD953053cDF19DA6175139E6a3Aa2775'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: arbitrumChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0x3464500CaD953053cDF19DA6175139E6a3Aa2775'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: arbitrumAssetId,
          value: '68640360000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
            totalValue: '129549687',
            components: [{ value: '129549687' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
            totalValue: '129549687',
            components: [{ value: '129549687' }],
            token: usdcToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)
      expect(expected).toEqual(actual)
    })
  })

  describe('erc20', () => {
    it('should be able to parse approve mempool', async () => {
      const { txMempool } = erc20Approve
      const address = '0x9063e1A6dd076899F6A0057475e8614e17536F59'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: arbitrumChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
          method: 'approve',
          parser: 'erc20',
          value: '16152620',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0x9063e1A6dd076899F6A0057475e8614e17536F59'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: arbitrumAssetId,
          value: '97199000000000',
        },
        transfers: [],
        data: {
          assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
          method: 'approve',
          parser: 'erc20',
          value: '16152620',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('zrx trade', () => {
    it('should be able to parse eth -> token', async () => {
      const { tx } = zrxTradeEthToUsdc
      const address = '0xa684bAEfeE2D6595d330d1762A9e8AcA789e7098'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: arbitrumAssetId,
        components: [{ value: '944413987404689' }],
        from: address,
        to: ZRX_ETHEREUM_PROXY_CONTRACT,
        totalValue: '944413987404689',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        components: [{ value: '1587041' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: usdcToken,
        totalValue: '1587041',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '367853200000000',
          assetId: arbitrumAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> eth', async () => {
      const { tx } = zrxTradeUsdcToEth
      const address = '0xd6FF47274924ebA4cF896CbD76f25FfB2199D39F'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        components: [{ value: '1987895' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: usdcToken,
        totalValue: '1987895',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: arbitrumAssetId,
        components: [{ value: '1171589513311335' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        totalValue: '1171589513311335',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '381266900000000',
          assetId: arbitrumAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token', async () => {
      const { tx } = zrxTradeUsdcToWbtc
      const address = '0xCB11673592cC6C4B9584F33BBBA6C6cF07Dde3f7'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        components: [{ value: '100000000' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: usdcToken,
        totalValue: '100000000',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: 'eip155:42161/erc20:0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
        components: [{ value: '356237' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: {
          contract: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
          decimals: 8,
          name: 'Wrapped BTC',
          symbol: 'WBTC',
        },
        totalValue: '356237',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '276602100000000',
          assetId: arbitrumAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }
      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })
  })

  describe('rfox', () => {
    it('should be able to stake', async () => {
      const { tx } = rfoxStake
      const address = '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986'

      const expected: ParsedTx = {
        txid: tx.txid,
        trade: undefined,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        fee: {
          assetId: arbitrumAssetId,
          value: '3013123887600',
        },
        data: {
          method: 'stake',
          type: 'evm',
          parser: 'rfox',
          assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
          runeAddress: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
        },
        status: TxStatus.Confirmed,
        transfers: [
          {
            assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
            components: [{ value: '1000000000000000000' }],
            from: address,
            to: '0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56',
            token: foxToken,
            totalValue: '1000000000000000000',
            type: TransferType.Send,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to unstake', async () => {
      const { tx } = rfoxUnstake
      const address = '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        fee: {
          assetId: arbitrumAssetId,
          value: '44360779710690',
        },
        data: {
          method: 'unstakeRequest',
          parser: 'rfox',
          type: 'evm',
          assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
          value: '3273624096679687500',
        },
        status: TxStatus.Confirmed,
        transfers: [],
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to withdraw claim', async () => {
      const { tx } = rfoxWithdraw
      const address = '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        fee: {
          assetId: arbitrumAssetId,
          value: '41698790000000',
        },
        data: {
          method: 'withdraw',
          parser: 'rfox',
          type: 'evm',
          assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
          claimIndex: 0,
        },
        status: TxStatus.Confirmed,
        transfers: [
          {
            assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
            components: [{ value: '4364832128906250000' }],
            from: '0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56',
            to: address,
            token: foxToken,
            totalValue: '4364832128906250000',
            type: TransferType.Receive,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to set RUNE address', async () => {
      const { tx } = rfoxSetRuneAddress
      const address = '0x5daF465a9cCf64DEB146eEaE9E7Bd40d6761c986'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: arbitrumChainId,
        confirmations: tx.confirmations,
        fee: {
          assetId: arbitrumAssetId,
          value: '39355169490000',
        },
        data: {
          method: 'setRuneAddress',
          parser: 'rfox',
          type: 'evm',
          assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
          runeAddress: 'thor1clpczglrkrvdq9xtcsmj9a8ayrjeet2llcqufl',
        },
        status: TxStatus.Confirmed,
        transfers: [],
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('arbitrumBridge', () => {
    it('should be able to parse erc20 gateway receive', async () => {
      const tx = arbitrumBridgeErc20GatewayReceive
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address,
        blockHash: '0x88c59619369225d89f91415908b49e1d5a3ef8cdc1020df41d46ad8e2427c9b3',
        blockHeight: 224156285,
        blockTime: 1718966123,
        chainId: 'eip155:42161',
        confirmations: 1114870,
        data: {
          assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
          method: 'finalizeInboundTransferDeposit',
          parser: 'arbitrumBridge',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [],
        txid: '0xb783d42f38d0487ff859c9cc0a92ae76bdeb5b06e33229063d98cec87cd37aaf',
      }
      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse erc20 receive', async () => {
      const tx = arbitrumBridgeErc20ReceiveTx
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address,
        blockHash: '0x1c60bd793afe792e64ee15c613f06ef6a0cf5efa9e7d2729b43f834dc2bc356f',
        blockHeight: 224500284,
        blockTime: 1719052133,
        chainId: 'eip155:42161',
        confirmations: 1180014,
        data: {
          assetId: 'eip155:42161/erc20:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
          method: 'finalizeInboundTransferDeposit',
          parser: 'arbitrumBridge',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [
          {
            assetId: 'eip155:42161/erc20:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
            components: [
              {
                value: '2000000',
              },
            ],
            from: '0x0000000000000000000000000000000000000000',
            id: undefined,
            to: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
            token: {
              contract: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
              decimals: 6,
              name: 'USD Coin (Arb1)',
              symbol: 'USDC',
            },
            totalValue: '2000000',
            type: 'Receive',
          },
        ],
        txid: '0x3e990a071163262202d0c9a412c891c8f8a14007c97cd7a0c347d2ac64b4b98c',
      }
      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse erc20 withdraw', async () => {
      const tx = arbitrumBridgeErc20WithdrawTx
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
        blockHash: '0xbfa51881976c1a05afd00a9e82b778af66766b2cacd6b85e48d29aec44c52061',
        blockHeight: 224270780,
        blockTime: 1718994794,
        chainId: 'eip155:42161',
        confirmations: 1409518,
        data: {
          assetId: 'eip155:42161/erc20:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
          method: 'outboundTransfer',
          parser: 'arbitrumBridge',
          destinationAddress: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
          destinationAssetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          value: '1000',
        },
        fee: {
          assetId: 'eip155:42161/slip44:60',
          value: '1695320154120',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [
          {
            assetId: 'eip155:42161/erc20:0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
            components: [
              {
                value: '1000',
              },
            ],
            from: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
            id: undefined,
            to: '0x0000000000000000000000000000000000000000',
            token: {
              contract: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
              decimals: 6,
              name: 'USD Coin (Arb1)',
              symbol: 'USDC',
            },
            totalValue: '1000',
            type: 'Send',
          },
        ],
        txid: '0x61a27cddd98e33d34a61c10c0a2ea1e608e4bae5469d9f1f5e3ad4649cb57817',
      }

      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse ETH receive', async () => {
      const tx = arbitrumBridgeNativeReceiveTx
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address,
        blockHash: '0x1c60bd793afe792e64ee15c613f06ef6a0cf5efa9e7d2729b43f834dc2bc356f',
        blockHeight: 224500284,
        blockTime: 1719052133,
        chainId: 'eip155:42161',
        confirmations: 767016,
        data: {
          assetId: undefined,
          method: 'submitRetryable',
          parser: 'arbitrumBridge',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [],
        txid: '0x7c22a8568b2703db2c87ad60ba1d6ef346012b0d9866ac6ae8e21a1b8b9089eb',
      }
      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse ETH withdraw request', async () => {
      const tx = arbitrumBridgeNativeWithdrawRequest
      const address = '0x94a42DB1E578eFf403B1644FA163e523803241Fd'

      const expected = {
        address: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
        blockHash: '0x0b530cd0fa06588c075e5627a0ac9e39e7e29af8120b392c1ad4baf61b9d97be',
        blockHeight: 224271569,
        blockTime: 1718994989,
        chainId: 'eip155:42161',
        confirmations: 1408729,
        data: {
          assetId: undefined,
          method: 'withdrawEth',
          parser: 'arbitrumBridge',
          destinationAddress: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
          destinationAssetId: ethAssetId,
          value: '100000000000',
        },
        fee: {
          assetId: 'eip155:42161/slip44:60',
          value: '12725698912890',
        },
        status: 'Confirmed',
        trade: undefined,
        transfers: [
          {
            assetId: 'eip155:42161/slip44:60',
            components: [
              {
                value: '100000000000',
              },
            ],
            from: '0x94a42DB1E578eFf403B1644FA163e523803241Fd',
            id: undefined,
            to: '0x0000000000000000000000000000000000000064',
            token: undefined,
            totalValue: '100000000000',
            type: 'Send',
          },
        ],
        txid: '0x0ea82db2b0bedc5f6ebb8aeaed7e1751f1d974f37fce8d751877350d45721c35',
      }
      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })
  })
})

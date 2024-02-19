import { arbitrumAssetId, arbitrumChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import type { ethers } from 'ethers'
import { describe, expect, it, vi } from 'vitest'

import type { Trade, Transfer } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { V1Api } from '../../index'
import { TransactionParser, ZRX_ARBITRUM_PROXY_CONTRACT } from '../index'
import erc20Approve from './mockData/erc20Approve'
import erc721 from './mockData/erc721'
import erc1155 from './mockData/erc1155'
import ethSelfSend from './mockData/ethSelfSend'
import ethStandard from './mockData/ethStandard'
import { usdcToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import zrxTradeEthToUsdc from './mockData/zrxTradeEthToUsdc'
import zrxTradeUsdcToEth from './mockData/zrxTradeUsdcToEth'
import zrxTradeUsdcToWbtc from './mockData/zrxTradeUsdcToWbtc'

const mockedApi = vi.mocked(new V1Api())

vi.mock('ethers', async importActual => {
  const actual: typeof ethers = await importActual()
  return {
    ...actual,
    Contract: vi.fn().mockImplementation(address => ({
      decimals: () => {
        switch (address as string) {
          case '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48':
            return 6
          case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
            return 18
          case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
            return 18
          case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
            return 18
          default:
            throw new Error(`no decimals mock for address: ${address}`)
        }
      },
      name: () => {
        switch (address as string) {
          case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
            return 'FOX'
          case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
            return 'Uniswap V2'
          case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
            return 'Wrapped Ether'
          default:
            throw new Error(`no decimals mock for address: ${address}`)
        }
      },
      symbol: () => {
        switch (address as string) {
          case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
            return 'FOX'
          case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
            return 'UNI-V2'
          case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
            return 'WETH'
          default:
            throw new Error(`no decimals mock for address: ${address}`)
        }
      },
    })),

    JsonRpcProvider: vi.fn(),
    default: {
      ...actual,
      Contract: vi.fn().mockImplementation(address => ({
        decimals: () => {
          switch (address as string) {
            case '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48':
              return 6
            case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
              return 18
            case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
              return 18
            case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
              return 18
            default:
              throw new Error(`no decimals mock for address: ${address}`)
          }
        },
        name: () => {
          switch (address as string) {
            case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
              return 'FOX'
            case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
              return 'Uniswap V2'
            case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
              return 'Wrapped Ether'
            default:
              throw new Error(`no decimals mock for address: ${address}`)
          }
        },
        symbol: () => {
          switch (address as string) {
            case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
              return 'FOX'
            case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
              return 'UNI-V2'
            case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
              return 'WETH'
            default:
              throw new Error(`no decimals mock for address: ${address}`)
          }
        },
      })),
    },
  }
})

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
        to: ZRX_ARBITRUM_PROXY_CONTRACT,
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
})

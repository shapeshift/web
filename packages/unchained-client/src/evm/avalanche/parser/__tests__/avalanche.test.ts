import { avalancheAssetId, avalancheChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { ZRX_AVALANCHE_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { describe, expect, it, vi } from 'vitest'

import type { Trade, Transfer } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { V1Api } from '../../index'
import { TransactionParser } from '../index'
import avaxSelfSend from './mockData/avaxSelfSend'
import avaxStandard from './mockData/avaxStandard'
import erc20Approve from './mockData/erc20Approve'
import erc721 from './mockData/erc721'
import erc1155 from './mockData/erc1155'
import { usdcToken, wrappedBitcoin, wrappedEther } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import zrxTradeAvaxToWeth from './mockData/zrxTradeAvaxToWeth'
import zrxTradeWethToAvax from './mockData/zrxTradeWethToAvax'
import zrxTradeWethToWbtc from './mockData/zrxTradeWethToWbtc'

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
  chainId: avalancheChainId,
  assetId: avalancheAssetId,
  api: mockedApi,
  midgardUrl: '',
})

describe('parseTx', () => {
  describe('standard', () => {
    describe('avax', () => {
      it('should be able to parse avax mempool send', async () => {
        const { txMempool } = avaxStandard
        const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Send,
              to: '0x744d17684Cb717daAA3530c9840c7501BB29fAD0',
              from: address,
              assetId: avalancheAssetId,
              totalValue: '6350190000000000000',
              components: [{ value: '6350190000000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse avax send', async () => {
        const { tx } = avaxStandard
        const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: avalancheAssetId,
            value: '573508559337000',
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x744d17684Cb717daAA3530c9840c7501BB29fAD0',
              from: address,
              assetId: avalancheAssetId,
              totalValue: '6350190000000000000',
              components: [{ value: '6350190000000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse avax mempool receive', async () => {
        const { txMempool } = avaxStandard
        const address = '0x744d17684Cb717daAA3530c9840c7501BB29fAD0'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
              assetId: avalancheAssetId,
              totalValue: '6350190000000000000',
              components: [{ value: '6350190000000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse avax receive', async () => {
        const { tx } = avaxStandard
        const address = '0x744d17684Cb717daAA3530c9840c7501BB29fAD0'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
              assetId: avalancheAssetId,
              totalValue: '6350190000000000000',
              components: [{ value: '6350190000000000000' }],
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
        const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token send', async () => {
        const { tx } = tokenStandard
        const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: avalancheAssetId,
            value: '1736704000000000',
          },
          transfers: [
            {
              type: TransferType.Send,
              from: address,
              to: '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df',
              assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
              totalValue: '143199292',
              components: [{ value: '143199292' }],
              token: usdcToken,
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token mempool receive', async () => {
        const { txMempool } = tokenStandard
        const address = '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token receive', async () => {
        const { tx } = tokenStandard
        const address = '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: avalancheChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              from: '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b',
              to: address,
              assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
              totalValue: '143199292',
              components: [{ value: '143199292' }],
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
        const address = '0x1CE7E58d621124E3478D227751D5672AeeF7F87d'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc721
        const address = '0x1CE7E58d621124E3478D227751D5672AeeF7F87d'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: avalancheAssetId,
            value: '12197872615144426',
          },
          data: {
            parser: 'nft',
            mediaById: { '34': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
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
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc721
        const address = '0x64813357113500b9829Fd47956E6fa58EbB56f66'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc721
        const address = '0x64813357113500b9829Fd47956E6fa58EbB56f66'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '34': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
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
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })

    describe('erc1155', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = erc1155
        const address = '0xD9e686e69131E4068a3dd381F4C4cafe3759AE3F'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc1155
        const address = '0xD9e686e69131E4068a3dd381F4C4cafe3759AE3F'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: avalancheAssetId,
            value: '8660269633799979',
          },
          data: {
            parser: 'nft',
            mediaById: { '690': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
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
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc1155
        const address = '0x0219985aF43434a342eec137141247333A275F30'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc1155
        const address = '0x0219985aF43434a342eec137141247333A275F30'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:43114',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '690': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
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
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })
  })

  describe('self send', () => {
    it('should be able to parse avax mempool', async () => {
      const { txMempool } = avaxSelfSend
      const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse avax', async () => {
      const { tx } = avaxSelfSend
      const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '573508559337000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '1736704000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            totalValue: '143199292',
            components: [{ value: '143199292' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            totalValue: '143199292',
            components: [{ value: '143199292' }],
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
      const address = '0xA82a74B86fE11FB430Ce7A529C37efAd82ea222d'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
          method: 'approve',
          parser: 'erc20',
          value: '108516271',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0xA82a74B86fE11FB430Ce7A529C37efAd82ea222d'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '1645985000000000',
        },
        transfers: [],
        data: {
          assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
          method: 'approve',
          parser: 'erc20',
          value: '108516271',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('zrx trade', () => {
    it('should be able to parse token -> avax', async () => {
      const { tx } = zrxTradeWethToAvax
      const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer: Transfer = {
        assetId: avalancheAssetId,
        components: [{ value: '1419200313588432512' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        totalValue: '1419200313588432512',
        type: TransferType.Receive,
      }

      const sellTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
        components: [{ value: '20000000000000000' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: wrappedEther,
        totalValue: '20000000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '6626525000000000',
          assetId: avalancheAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse avax -> token', async () => {
      const { tx } = zrxTradeAvaxToWeth
      const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
        components: [{ value: '819115016056635' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: wrappedEther,
        totalValue: '819115016056635',
        type: TransferType.Receive,
      }

      const sellTransfer: Transfer = {
        assetId: avalancheAssetId,
        components: [{ value: '50000000000000000' }],
        from: address,
        to: ZRX_AVALANCHE_PROXY_CONTRACT,
        totalValue: '50000000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '6346125000000000',
          assetId: avalancheAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token', async () => {
      const { tx } = zrxTradeWethToWbtc
      const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x50b7545627a5162f82a992c33b87adc75187b218',
        components: [{ value: '14605' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: wrappedBitcoin,
        totalValue: '14605',
        type: TransferType.Receive,
      }

      const sellTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
        components: [{ value: '2000000000000000' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: wrappedEther,
        totalValue: '2000000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '8329875000000000',
          assetId: avalancheAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})

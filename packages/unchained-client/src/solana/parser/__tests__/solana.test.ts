import { solanaChainId, solAssetId } from '@shapeshiftoss/caip'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { TransferType, TxStatus } from '../../../types'
import type { ParsedTx, Token } from '../../parser'
import { V1Api } from '../../parser'
import { TransactionParser } from '../index'
import solSelfSend from './mockData/solSelfSend'
import solStandard from './mockData/solStandard'
import { usdcApiToken, usdcParserToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import tokenStandardWithCreate from './mockData/tokenStandardWithCreate'

const getTokenMock = vi.fn<any, Token>()

vi.mock('../../../generated/solana', async importActual => {
  const actual = await importActual<any>()
  return {
    ...actual,
    V1Api: vi.fn().mockImplementation(() => ({
      getToken: getTokenMock,
    })),
  }
})

const txParser = new TransactionParser({
  assetId: solAssetId,
  chainId: solanaChainId,
  api: new V1Api(),
})

describe('parseTx', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  describe('standard', () => {
    it('should be able to parse sol send', async () => {
      const { tx } = solStandard
      const address = 'B1fnGVnz6Q2eZPXG1FPa8wix88yyNApwGhJTURHPh4qW'

      const expected: ParsedTx = {
        address,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        chainId: solanaChainId,
        confirmations: 1,
        fee: {
          assetId: solAssetId,
          value: '5000',
        },
        status: TxStatus.Confirmed,
        transfers: [
          {
            assetId: solAssetId,
            components: [{ value: '10000388' }],
            from: address,
            to: 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
            totalValue: '10000388',
            type: TransferType.Send,
          },
        ],
        txid: tx.txid,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse sol receive', async () => {
      const { tx } = solStandard
      const address = 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL'

      const expected: ParsedTx = {
        address,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        chainId: solanaChainId,
        confirmations: 1,
        status: TxStatus.Confirmed,
        transfers: [
          {
            assetId: solAssetId,
            components: [{ value: '10000388' }],
            from: 'B1fnGVnz6Q2eZPXG1FPa8wix88yyNApwGhJTURHPh4qW',
            to: address,
            totalValue: '10000388',
            type: TransferType.Receive,
          },
        ],
        txid: tx.txid,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token send', async () => {
      const { tx } = tokenStandard
      const address = 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV'

      getTokenMock.mockResolvedValueOnce(usdcApiToken)

      const expected: ParsedTx = {
        address,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        chainId: solanaChainId,
        confirmations: 1,
        fee: {
          assetId: solAssetId,
          value: '5000',
        },
        status: TxStatus.Confirmed,
        transfers: [
          {
            assetId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            components: [{ value: '100000' }],
            from: address,
            to: '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
            token: usdcParserToken,
            totalValue: '100000',
            type: TransferType.Send,
          },
        ],
        txid: tx.txid,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token receive', async () => {
      const { tx } = tokenStandard
      const address = '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN'

      getTokenMock.mockResolvedValueOnce(usdcApiToken)

      const expected: ParsedTx = {
        address,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        chainId: solanaChainId,
        confirmations: 1,
        status: TxStatus.Confirmed,
        transfers: [
          {
            assetId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            components: [{ value: '100000' }],
            from: 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV',
            to: address,
            token: usdcParserToken,
            totalValue: '100000',
            type: TransferType.Receive,
          },
        ],
        txid: tx.txid,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token send with create', async () => {
      const { tx } = tokenStandardWithCreate
      const address = 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV'

      getTokenMock.mockResolvedValueOnce(usdcApiToken)

      const expected: ParsedTx = {
        address,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        chainId: solanaChainId,
        confirmations: 1,
        fee: {
          assetId: solAssetId,
          value: '5000',
        },
        status: TxStatus.Confirmed,
        transfers: [
          {
            assetId: solAssetId,
            components: [{ value: '2039280' }],
            from: address,
            to: 'Eb3quTucZ9FGRMLtGzkrmzNFDZgzM1F8x56VyvBY5SZV',
            totalValue: '2039280',
            type: TransferType.Send,
          },
          {
            assetId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            components: [{ value: '100000' }],
            from: address,
            to: '9cErDgnadHNmEBMVn3hDAbooRDgnazfVNKhTF5SEQ8RN',
            token: usdcParserToken,
            totalValue: '100000',
            type: TransferType.Send,
          },
        ],
        txid: tx.txid,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })

  describe('self send', () => {
    it('should be able to parse sol', async () => {
      const { tx } = solSelfSend
      const address = 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: solanaChainId,
        confirmations: 1,
        status: TxStatus.Confirmed,
        fee: {
          assetId: solAssetId,
          value: '25000',
        },
        transfers: [
          {
            assetId: solAssetId,
            components: [{ value: '1' }],
            from: address,
            to: address,
            totalValue: '1',
            type: TransferType.Send,
          },
          {
            assetId: solAssetId,
            components: [{ value: '1' }],
            from: address,
            to: address,
            totalValue: '1',
            type: TransferType.Receive,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = 'DsYwEVzeSNMkU5PVwjwtZ8EDRQxaR6paXfFAdhMQxmaV'

      getTokenMock.mockResolvedValueOnce(usdcApiToken)

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: solanaChainId,
        confirmations: 1,
        status: TxStatus.Confirmed,
        fee: {
          assetId: solAssetId,
          value: '5000',
        },
        transfers: [
          {
            assetId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            components: [{ value: '500000' }],
            from: address,
            to: address,
            token: usdcParserToken,
            totalValue: '500000',
            type: TransferType.Send,
          },
          {
            assetId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            components: [{ value: '500000' }],
            from: address,
            to: address,
            token: usdcParserToken,
            totalValue: '500000',
            type: TransferType.Receive,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})

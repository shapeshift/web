import { solanaChainId, solAssetId } from '@shapeshiftoss/caip'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { TransferType, TxStatus } from '../../../types'
import type { ParsedTx } from '../../parser'
import { TransactionParser } from '../index'
import solSelfSend from './mockData/solSelfSend'
import solStandard from './mockData/solStandard'

const txParser = new TransactionParser({ assetId: solAssetId, chainId: solanaChainId })

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
          value: '25000',
          assetId: solAssetId,
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: solAssetId,
            totalValue: '1',
            components: [{ value: '1' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: solAssetId,
            totalValue: '1',
            components: [{ value: '1' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})

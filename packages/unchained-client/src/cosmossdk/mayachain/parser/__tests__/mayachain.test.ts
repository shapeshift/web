import { mayachainAssetId, mayachainChainId } from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'

import { TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import standard from './mockData/standard'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: mocks.get,
    })),
  }

  return {
    default: mockAxios,
  }
})

const txParser = new TransactionParser({
  chainId: mayachainChainId,
  assetId: mayachainAssetId,
  midgardUrl: '',
})

describe('parseTx', () => {
  it('should be able to parse a standard send tx', async () => {
    const { tx } = standard
    const address = 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      fee: {
        assetId: mayachainAssetId,
        value: '2000000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'maya1a7gg93dgwlulsrqf6qtage985ujhpu068zllw7',
          assetId: mayachainAssetId,
          totalValue: '43980000000000',
          components: [{ value: '43980000000000' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a standard receive tx', async () => {
    const { tx } = standard
    const address = 'maya1a7gg93dgwlulsrqf6qtage985ujhpu068zllw7'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '43980000000000',
          components: [{ value: '43980000000000' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })
})

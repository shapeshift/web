import { thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'

import type { Fee } from '../../../../types'
import { TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import standard from './mockData/standard'

const txParser = new TransactionParser({ chainId: thorchainChainId, assetId: thorchainAssetId })

describe('parseTx', () => {
  it('should be able to parse a standard send tx', async () => {
    const { tx, txNoFee, txWithFee } = standard
    const address = 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc'

    const fee: Fee = {
      assetId: thorchainAssetId,
      value: '12345',
    }

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: thorchainChainId,
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6',
          assetId: thorchainAssetId,
          totalValue: '1551500000000',
          components: [{ value: '1551500000000' }],
        },
      ],
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse a standard receive tx', async () => {
    const { tx } = standard
    const address = 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: thorchainChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
          to: address,
          assetId: thorchainAssetId,
          totalValue: '1551500000000',
          components: [{ value: '1551500000000' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })
})

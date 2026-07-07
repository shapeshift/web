import { describe, expect, it } from 'vitest'

import { extractTransactionData } from './extractTransactionData'

const base = { buyAsset: {}, feeData: {} } as any

describe('extractTransactionData — relay via transactionData', () => {
  it('passes through evm build data', () => {
    const step = {
      ...base,
      sellAsset: { chainId: 'eip155:1', assetId: 'eip155:1/slip44:60' },
      transactionData: { type: 'evm', chainId: 1, to: '0xTO', data: '0xDATA', value: '9' },
      relayTransactionMetadata: { relayId: 'r' },
    } as any
    expect(extractTransactionData(step)).toMatchObject({ type: 'evm', chainId: 1, to: '0xTO', data: '0xDATA', value: '9' })
  })

  it('maps internal utxo to external utxo_deposit', () => {
    const step = {
      ...base,
      sellAsset: { chainId: 'bip122:000000000019d6689c085ae165831e93', assetId: 'bip122:.../slip44:0' },
      transactionData: { type: 'utxo', to: 'bc1', opReturnData: 'ab', value: '5' },
      relayTransactionMetadata: { relayId: 'r' },
    } as any
    expect(extractTransactionData(step)).toEqual({ type: 'utxo_deposit', depositAddress: 'bc1', memo: 'ab', value: '5' })
  })
})

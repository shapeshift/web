import { describe, expect, it } from 'vitest'

import type { SwapperSpecificMetadata, TxBuildData } from './types'

describe('TxBuildData', () => {
  it('is a discriminated union narrowable by the `type` key', () => {
    const cases: TxBuildData[] = [
      { type: 'evm', chainId: 1, to: '0xto', data: '0xdata', value: '0' },
      { type: 'utxo', depositAddress: 'bc1', memo: '', value: '1' },
      { type: 'solana', instructions: [], addressLookupTableAddresses: [] },
      { type: 'cosmos', chainId: 'cosmoshub-4', to: 'cosmos1', value: '1' },
    ]

    expect(cases.map(c => c.type)).toEqual(['evm', 'utxo', 'solana', 'cosmos'])

    const evm = cases.find(c => c.type === 'evm')
    if (evm?.type === 'evm') expect(evm.to).toBe('0xto')

    const utxo = cases.find(c => c.type === 'utxo')
    if (utxo?.type === 'utxo') expect(utxo.depositAddress).toBe('bc1')
  })

  it('rejects unknown discriminants at type-check time', () => {
    // @ts-expect-error 'nope' is not a valid TxBuildData variant
    const bad: TxBuildData = { type: 'nope' }
    void bad
    expect(bad).toBeDefined()
  })
})

describe('SwapperSpecificMetadata.swapperMetadata', () => {
  it('carries a keyed relay tracking variant', () => {
    const m: SwapperSpecificMetadata['swapperMetadata'] = {
      swapper: 'relay',
      relayId: 'req_1',
      orderId: 'ord_1',
      data: '0xcalldata',
    }
    expect(m?.swapper).toBe('relay')
    if (m?.swapper === 'relay') expect(m.relayId).toBe('req_1')
  })
})

import { describe, expect, it } from 'vitest'

import { evmTxBuildData, utxoTxBuildData } from './toRelayTxBuildData'

describe('relay toRelayTxBuildData', () => {
  it('maps EVM item to evm TxBuildData', () => {
    expect(
      evmTxBuildData({ chainId: 1, to: '0xrelayer', value: '10', data: '0xabc', gasLimit: '21000' }),
    ).toEqual({ type: 'evm', chainId: 1, to: '0xrelayer', data: '0xabc', value: '10', gasLimit: '21000' })
  })

  it('maps UTXO deposit to utxo TxBuildData', () => {
    expect(utxoTxBuildData({ to: 'bc1relayer', opReturnData: 'deadbeef', value: '1000' })).toEqual({
      type: 'utxo',
      depositAddress: 'bc1relayer',
      memo: 'deadbeef',
      value: '1000',
    })
  })
})

import { describe, expect, it } from 'vitest'

import { evmTxBuildData } from './toTxBuildData'

describe('evmTxBuildData', () => {
  it('maps params to an evm TxBuildData', () => {
    expect(evmTxBuildData({ chainId: 1, to: '0xto', data: '0xdata', value: '10', gasLimit: '21000' })).toEqual({
      type: 'evm',
      chainId: 1,
      to: '0xto',
      data: '0xdata',
      value: '10',
      gasLimit: '21000',
    })
  })

  it('leaves gasLimit undefined when omitted', () => {
    expect(evmTxBuildData({ chainId: 8453, to: '0xto', data: '0x', value: '0' }).gasLimit).toBeUndefined()
  })
})

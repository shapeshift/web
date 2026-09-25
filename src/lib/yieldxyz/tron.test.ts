import { describe, expect, it } from 'vitest'

import { getTronContractCallFromUnsignedTransaction } from './tron'

// the sTRX stake yield.xyz hands back: deposit() on the JustLend sTRX contract with the TRX as call value
const stakeTx = JSON.stringify({
  visible: false,
  txID: 'ab',
  raw_data_hex: 'cd',
  raw_data: {
    fee_limit: 150000000,
    contract: [
      {
        type: 'TriggerSmartContract',
        parameter: {
          type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
          value: {
            owner_address: '41f0623e1012177482912fb057e44e1a9769b1f588',
            contract_address: '41c64e69acde1c7b16c2a3efcdbbdaa96c3644c2b3',
            data: 'd0e30db0',
            call_value: 5000000,
          },
        },
      },
    ],
  },
})

describe('getTronContractCallFromUnsignedTransaction', () => {
  it('lifts the contract call out of a TriggerSmartContract', () => {
    expect(getTronContractCallFromUnsignedTransaction(stakeTx)).toEqual({
      to: 'TU3kjFuhtEo42tsCBtfYUAZxoqQ4yuSLQ5',
      data: 'd0e30db0',
      value: '5000000',
      feeLimit: '150000000',
    })
  })

  it('sends no value when the call carries none', () => {
    const tx = JSON.parse(stakeTx)
    delete tx.raw_data.contract[0].parameter.value.call_value

    expect(getTronContractCallFromUnsignedTransaction(JSON.stringify(tx))?.value).toBe('0')
  })

  it('is undefined for a payload that is not json', () => {
    expect(getTronContractCallFromUnsignedTransaction('0xdeadbeef')).toBeUndefined()
  })

  it('is undefined for a plain transfer', () => {
    const tx = JSON.parse(stakeTx)
    tx.raw_data.contract[0].type = 'TransferContract'

    expect(getTronContractCallFromUnsignedTransaction(JSON.stringify(tx))).toBeUndefined()
  })
})

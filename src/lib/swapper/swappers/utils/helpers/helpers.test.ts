import Web3 from 'web3'

import { bn } from '../../../../bignumber/bignumber'
import { normalizeAmount, normalizeIntegerAmount } from './helpers'

jest.mock('web3')

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(),
        })),
      },
    })),
  },
}))

describe('utils', () => {
  describe('normalizeAmount', () => {
    it('should return a string number rounded to the 16th decimal place', () => {
      const result = normalizeAmount('586084736227728377283728272309128120398')
      expect(result).toEqual('586084736227728400000000000000000000000')
    })
  })
})

describe('normalizeIntegerAmount', () => {
  it('should return a string number rounded to the 16th decimal place', () => {
    const result = normalizeIntegerAmount('586084736227728377283728272309128120398')
    expect(result).toEqual('586084736227728400000000000000000000000')

    const result2 = normalizeIntegerAmount('586084736227728.3')
    expect(result2).toEqual('586084736227728')
  })

  it('should return a string number rounded to the 16th decimal place with number and bn inputs', () => {
    const result1 = normalizeIntegerAmount(bn('586084736227728377283728272309128120398'))
    expect(result1).toEqual('586084736227728400000000000000000000000')

    const result2 = normalizeIntegerAmount(bn('586084736227728.3'))
    expect(result2).toEqual('586084736227728')

    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    const result3 = normalizeIntegerAmount(58608473622772841)
    expect(result3).toEqual('58608473622772840')

    const result4 = normalizeIntegerAmount(586084736227728.3)
    expect(result4).toEqual('586084736227728')
  })
})

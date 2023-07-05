import { thorchainChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'

import { bn } from '../../../../bignumber/bignumber'
import { getTreasuryAddressFromChainId, normalizeAmount, normalizeIntegerAmount } from './helpers'

describe('utils', () => {
  describe('normalizeAmount', () => {
    it('should preserve large numbers without rounding', () => {
      const amount = '586084736227728377283728272309128120398'
      const result = normalizeAmount(amount)
      expect(result).toEqual(amount)
    })
    it('should handle large numbers without rounding', () => {
      const amount = '1154718796212771995121'
      const result = normalizeAmount(amount)
      expect(result).toEqual(amount)
    })

    it('should handle BigNumber input correctly', () => {
      const amount = bn('123456789.123456789')
      const result = normalizeAmount(amount)
      expect(result).toEqual('123456789.123456789')
    })

    it('should handle numbers input correctly', () => {
      const amount = 123456
      const result = normalizeAmount(amount)
      expect(result).toEqual('123456')
    })

    it('should handle strings input correctly', () => {
      const amount = '123456'
      const result = normalizeAmount(amount)
      expect(result).toEqual(amount)
    })

    it('should handle decimal numbers correctly', () => {
      const amount = '123456.7890123456789'
      const result = normalizeAmount(amount)
      expect(result).toEqual(amount)
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

describe('getTreasuryAddressFromChainId', () => {
  it('throws for unsupported chains', () => {
    expect(() => getTreasuryAddressFromChainId(thorchainChainId as EvmChainId)).toThrow(
      '[getTreasuryAddressFromChainId] - Unsupported chainId',
    )
  })
})

import { calculateSlippageMargin } from './utils'

describe('calculateSlippageMargin', () => {
  it('should throw an error if amount is not provided', () => {
    expect(() => {
      calculateSlippageMargin(null, 18)
    }).toThrowError('Amount not given for slippage')
  })

  it('should return the correct slippage margin when a valid amount and precision are provided', () => {
    const amount = '1000'
    const precision = 18
    const expectedResult = '995000000000000000000'

    expect(calculateSlippageMargin(amount, precision)).toBe(expectedResult)
  })

  it('should return the correct slippage margin for different amount and precision values', () => {
    const amount = '500'
    const precision = 6
    const expectedResult = '497500000'

    expect(calculateSlippageMargin(amount, precision)).toBe(expectedResult)
  })

  it('should return 0 when the amount is 0', () => {
    const amount = '0'
    const precision = 18
    const expectedResult = '0'

    expect(calculateSlippageMargin(amount, precision)).toBe(expectedResult)
  })

  it('should return the correct slippage margin for decimal values', () => {
    const amount = '123.456'
    const precision = 18
    const expectedResult = '122838720000000000000'

    expect(calculateSlippageMargin(amount, precision)).toBe(expectedResult)
  })

  it('should return the correct slippage margin for decimal values and precision 6', () => {
    const amount = '123.456'
    const precision = 6
    const expectedResult = '122838720'

    expect(calculateSlippageMargin(amount, precision)).toBe(expectedResult)
  })

  it('should return the correct slippage margin for large amount and precision values', () => {
    const amount = '1000000000000000'
    const precision = 18
    const expectedResult = '995000000000000000000000000000000'

    expect(calculateSlippageMargin(amount, precision)).toBe(expectedResult)
  })

  it('should return the correct slippage margin for large amount and precision 6', () => {
    const amount = '1000000000000000'
    const precision = 6
    const expectedResult = '995000000000000000000'

    expect(calculateSlippageMargin(amount, precision)).toBe(expectedResult)
  })
})

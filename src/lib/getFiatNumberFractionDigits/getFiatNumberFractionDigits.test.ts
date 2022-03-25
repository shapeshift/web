/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFiatNumberFractionDigits } from './getFiatNumberFractionDigits'

describe('getFiatNumberFractionDigits', () => {
  it('should return 0 for numbers greater than or equal to 1', () => {
    expect(getFiatNumberFractionDigits(1)).toEqual(0)
  })
  it('should return 0 for numbers less than 0.000001', () => {
    expect(getFiatNumberFractionDigits(0.0000005)).toEqual(0)
  })
  it('should return 3 for fiat number 0.5', () => {
    expect(getFiatNumberFractionDigits(0.5)).toEqual(3)
  })
  it('should return 4 for fiat number 0.05', () => {
    expect(getFiatNumberFractionDigits(0.05)).toEqual(4)
  })
  it('should return 5 for fiat number 0.005', () => {
    expect(getFiatNumberFractionDigits(0.005)).toEqual(5)
  })
  it('should return 6 for fiat number 0.0005', () => {
    expect(getFiatNumberFractionDigits(0.0005)).toEqual(6)
  })
  it('should return 7 for fiat number 0.00005', () => {
    expect(getFiatNumberFractionDigits(0.00005)).toEqual(7)
  })
  it('should return 8 for fiat number 0.000005', () => {
    expect(getFiatNumberFractionDigits(0.000005)).toEqual(8)
  })
})

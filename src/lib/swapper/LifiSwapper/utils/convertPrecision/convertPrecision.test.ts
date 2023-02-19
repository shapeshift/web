import { convertPrecision } from './convertPrecision'

describe('convertPrecision', () => {
  it('can convert values for increased precision', () => {
    const value = '1234'
    const expectation = '1234000'

    const result = convertPrecision(value, 3, 6)
    expect(result).toEqual(expectation)
  })

  it('can convert values for decreased precision', () => {
    const value = '1234000'
    const expectation = '1234'

    const result = convertPrecision(value, 6, 3)
    expect(result).toEqual(expectation)
  })

  it('treats 0 as 0 when increasing precision', () => {
    const value = '0'
    const expectation = '0'

    const result = convertPrecision(value, 12, 18)
    expect(result).toEqual(expectation)
  })

  it('treats 0 as 0 when decreasing precision', () => {
    const value = '0'
    const expectation = '0'

    const result = convertPrecision(value, 18, 12)
    expect(result).toEqual(expectation)
  })
})

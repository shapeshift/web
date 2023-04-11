import { fromBaseUnit } from './math'

describe('lib/math', () => {
  describe('fromBaseUnit', () => {
    it('should correctly convert and round down with given displayDecimals', () => {
      const result = fromBaseUnit(123456789, 4, 2)
      expect(result).toBe('12345.67')
    })

    it('should correctly convert without displayDecimals and return full precision', () => {
      const result = fromBaseUnit(123456789, 4)
      expect(result).toBe('12345.6789')
    })

    it('should correctly convert and round down with given displayDecimals for another input', () => {
      const result = fromBaseUnit(987654321, 6, 3)
      expect(result).toBe('987.654')
    })

    it('should correctly convert without displayDecimals and return full precision for another input', () => {
      const result = fromBaseUnit(987654321, 6)
      expect(result).toBe('987.654321')
    })

    it('should correctly convert and round down with given displayDecimals for high precision input', () => {
      const result = fromBaseUnit('182912819182912192', 18, 8)
      expect(result).toBe('0.18291281')
    })

    it('should correctly convert without displayDecimals and return full precision for high precision input', () => {
      const result = fromBaseUnit('182912819182912192', 18)
      expect(result).toBe('0.182912819182912192')
    })
  })
})

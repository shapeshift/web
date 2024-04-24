import { describe, expect, it } from 'vitest'

import { isValidAccountNumber } from './accounts'

describe('lib/utils', () => {
  describe('isValidAccountNumber', () => {
    it('should return true for 0', () => {
      const accountNumber = 0
      expect(isValidAccountNumber(accountNumber)).toBeTruthy()
    })

    it('should return true for 1', () => {
      const accountNumber = 1
      expect(isValidAccountNumber(accountNumber)).toBeTruthy()
    })

    it('should return false for undefined', () => {
      const accountNumber = undefined
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
    })

    it('should return false for null', () => {
      const accountNumber = null
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
    })

    it('should return false for negative numbers', () => {
      const accountNumber = -1
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
    })

    it('should return false for non integers', () => {
      const accountNumber = 1.1
      expect(isValidAccountNumber(accountNumber)).toBeFalsy()
    })
  })
})

import { describe, expect, it } from 'vitest'

import {
  buildCancelSigningPayload,
  buildOrderSigningPayload,
  formatSignatureForApi,
  getExchangeDomain,
  getHyperliquidL1Domain,
  HYPERLIQUID_CHAIN_ID,
  isValidSignature,
  splitSignature,
  validateCancelAction,
  validateOrderAction,
} from './signing'

describe('signing', () => {
  describe('HYPERLIQUID_CHAIN_ID', () => {
    it('should equal 1337', () => {
      expect(HYPERLIQUID_CHAIN_ID).toBe(1337)
    })
  })

  describe('getExchangeDomain', () => {
    it('should return domain with chainId 1337', () => {
      const domain = getExchangeDomain()

      expect(domain.name).toBe('Exchange')
      expect(domain.version).toBe('1')
      expect(domain.chainId).toBe(1337)
      expect(domain.verifyingContract).toBe('0x0000000000000000000000000000000000000000')
    })
  })

  describe('getHyperliquidL1Domain', () => {
    it('should return L1 domain with chainId 1337', () => {
      const domain = getHyperliquidL1Domain()

      expect(domain.name).toBe('HyperliquidSignTransaction')
      expect(domain.version).toBe('1')
      expect(domain.chainId).toBe(1337)
      expect(domain.verifyingContract).toBe('0x0000000000000000000000000000000000000000')
    })
  })

  describe('buildOrderSigningPayload', () => {
    it('should create correct payload structure', () => {
      const action = {
        type: 'order' as const,
        orders: [
          {
            a: 0,
            b: true,
            p: '50000.00',
            s: '0.1',
            r: false,
            t: { limit: { tif: 'Gtc' } },
          },
        ],
        grouping: 'na' as const,
      }

      const payload = buildOrderSigningPayload(action)

      expect(payload.domain.chainId).toBe(1337)
      expect(payload.primaryType).toBe('OrderAction')
      expect(payload.message).toEqual(action)
      expect(payload.types.Order).toBeDefined()
    })
  })

  describe('buildCancelSigningPayload', () => {
    it('should create correct cancel payload structure', () => {
      const action = {
        type: 'cancel' as const,
        cancels: [
          {
            a: 0,
            o: 12345,
          },
        ],
      }

      const payload = buildCancelSigningPayload(action)

      expect(payload.domain.chainId).toBe(1337)
      expect(payload.primaryType).toBe('CancelAction')
      expect(payload.message).toEqual(action)
    })
  })

  describe('validateOrderAction', () => {
    it('should return true for valid order action', () => {
      const action = {
        type: 'order' as const,
        orders: [
          {
            a: 0,
            b: true,
            p: '50000',
            s: '0.1',
            r: false,
            t: { limit: { tif: 'Gtc' } },
          },
        ],
        grouping: 'na' as const,
      }

      expect(validateOrderAction(action)).toBe(true)
    })

    it('should return false for empty orders', () => {
      const action = {
        type: 'order' as const,
        orders: [],
        grouping: 'na' as const,
      }

      expect(validateOrderAction(action)).toBe(false)
    })

    it('should return false for invalid order data', () => {
      const action = {
        type: 'order' as const,
        orders: [
          {
            a: 'invalid' as unknown as number,
            b: true,
            p: '50000',
            s: '0.1',
            r: false,
            t: { limit: { tif: 'Gtc' } },
          },
        ],
        grouping: 'na' as const,
      }

      expect(validateOrderAction(action)).toBe(false)
    })
  })

  describe('validateCancelAction', () => {
    it('should return true for valid cancel action', () => {
      const action = {
        type: 'cancel' as const,
        cancels: [{ a: 0, o: 12345 }],
      }

      expect(validateCancelAction(action)).toBe(true)
    })

    it('should return false for empty cancels', () => {
      const action = {
        type: 'cancel' as const,
        cancels: [],
      }

      expect(validateCancelAction(action)).toBe(false)
    })
  })

  describe('splitSignature', () => {
    it('should correctly split a signature into r, s, v components', () => {
      const signature =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b' as const

      const { r, s, v } = splitSignature(signature)

      expect(r).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
      expect(s).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
      expect(v).toBe(27)
    })
  })

  describe('formatSignatureForApi', () => {
    it('should format signature for API consumption', () => {
      const signature =
        '0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200' as const

      const formatted = formatSignatureForApi(signature)

      expect(formatted).toHaveProperty('r')
      expect(formatted).toHaveProperty('s')
      expect(formatted).toHaveProperty('v')
    })
  })

  describe('isValidSignature', () => {
    it('should return true for valid signature', () => {
      const validSignature =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b' as const

      expect(isValidSignature(validSignature)).toBe(true)
    })

    it('should return false for signature not starting with 0x', () => {
      const invalidSignature =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b' as const

      expect(isValidSignature(invalidSignature)).toBe(false)
    })

    it('should return false for signature with wrong length', () => {
      const shortSignature = '0x1234567890abcdef' as const

      expect(isValidSignature(shortSignature)).toBe(false)
    })
  })
})

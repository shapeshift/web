import { Transaction } from '@shapeshiftoss/bitcoinjs-lib'
import { describe, expect, it, vi } from 'vitest'

import {
  getDisplayFeeRateSatPerVb,
  getDisplayFeeRateSatPerVbPrecise,
  getTxFeeRateSatPerVb,
  getTxFeeRateSatPerVbPrecise,
  getTxFeeSats,
  getTxVsize,
  resolveVinVoutIndex,
  toSats,
} from './speedUpUtils'

describe('speedUpUtils', () => {
  describe('toSats', () => {
    it('parses satoshi integer strings', () => {
      expect(toSats('512').toString()).toBe('512')
    })

    it('parses btc decimal strings to sats', () => {
      expect(toSats('0.00000512').toString()).toBe('512')
    })

    it('parses btc scientific notation to sats', () => {
      expect(toSats('1e-8').toString()).toBe('1')
    })
  })

  describe('getTxVsize', () => {
    it('uses explicit vsize first', () => {
      const tx = {
        vsize: 246,
        vin: [],
        vout: [],
      }
      expect(getTxVsize(tx).toString()).toBe('246')
    })

    it('falls back to weight/4', () => {
      const tx = {
        weight: 981,
        vin: [],
        vout: [],
      }
      expect(getTxVsize(tx).toString()).toBe('246')
    })

    it('rounds up weight/4 deterministically for odd weights', () => {
      const tx = {
        weight: 983,
        vin: [],
        vout: [],
      }
      expect(getTxVsize(tx).toString()).toBe('246')
    })

    it('uses bitcoinjs virtual size from hex when vsize and weight are missing', () => {
      const fromHexSpy = vi.spyOn(Transaction, 'fromHex').mockReturnValue({
        virtualSize: () => 246,
      } as Transaction)

      const tx = {
        hex: 'deadbeef',
        vin: [],
        vout: [],
      }

      expect(getTxVsize(tx).toString()).toBe('246')
      expect(fromHexSpy).toHaveBeenCalledWith('deadbeef')
      fromHexSpy.mockRestore()
    })
  })

  describe('fee calculations', () => {
    it('uses tx.fee when present', () => {
      const tx = {
        fee: '512',
        vin: [{ value: '3422' }, { value: '3089' }, { value: '1001' }],
        vout: [{ value: '7000' }],
      }

      expect(getTxFeeSats(tx).toString()).toBe('512')
    })

    it('falls back to vin-vout fee derivation when fee is missing', () => {
      const tx = {
        vin: [{ value: '3422' }, { value: '3089' }, { value: '1001' }],
        vout: [{ value: '7000' }],
      }

      expect(getTxFeeSats(tx).toString()).toBe('512')
    })

    it('derives current fee rate for the reported tx example as 2 sat/vB', () => {
      const tx = {
        fee: '512',
        weight: 981,
        vin: [{ value: '3422' }, { value: '3089' }, { value: '1001' }],
        vout: [{ value: '7000' }],
      }

      expect(getTxFeeRateSatPerVb(tx).toString()).toBe('2')
    })

    it('derives precise fee rate for the reported tx example as 2.09 sat/vB', () => {
      const tx = {
        fee: '512',
        weight: 981,
        vin: [{ value: '3422' }, { value: '3089' }, { value: '1001' }],
        vout: [{ value: '7000' }],
      }

      expect(getTxFeeRateSatPerVbPrecise(tx).toFixed(2)).toBe('2.09')
    })
  })

  describe('getDisplayFeeRateSatPerVb', () => {
    it('prefers tx fee rate over network average', () => {
      const tx = {
        fee: '512',
        weight: 981,
        vin: [{ value: '3422' }, { value: '3089' }, { value: '1001' }],
        vout: [{ value: '7000' }],
      }
      expect(
        getDisplayFeeRateSatPerVb({
          tx,
          networkAverageFeeRateSatPerVb: '1',
        }).toString(),
      ).toBe('2')
    })

    it('falls back to network average when tx fee rate is unavailable', () => {
      const tx = {
        fee: '0',
        vin: [],
        vout: [],
      }
      expect(
        getDisplayFeeRateSatPerVb({
          tx,
          networkAverageFeeRateSatPerVb: '11',
        }).toString(),
      ).toBe('11')
    })
  })

  describe('getDisplayFeeRateSatPerVbPrecise', () => {
    it('prefers precise tx fee rate over network average', () => {
      const tx = {
        fee: '512',
        weight: 981,
        vin: [{ value: '3422' }, { value: '3089' }, { value: '1001' }],
        vout: [{ value: '7000' }],
      }
      expect(
        getDisplayFeeRateSatPerVbPrecise({
          tx,
          networkAverageFeeRateSatPerVb: '1',
        }).toFixed(2),
      ).toBe('2.09')
    })
  })

  describe('resolveVinVoutIndex', () => {
    it('uses provided vin.vout directly when present', () => {
      const index = resolveVinVoutIndex({
        vinVout: 1,
        vinValue: '5000',
        vinAddress: 'bc1qabc',
        prevTxVouts: [{ value: '1111' }, { value: '5000' }],
      })

      expect(index).toBe(1)
    })

    it('ignores invalid vin.vout values and falls back to matching heuristics', () => {
      const index = resolveVinVoutIndex({
        vinVout: 'not-a-number',
        vinValue: '5000',
        vinAddress: 'bc1qxyz',
        prevTxVouts: [
          { value: '5000', addresses: ['bc1qabc'] },
          { value: '5000', addresses: ['bc1qxyz'] },
        ],
      })

      expect(index).toBe(1)
    })

    it('resolves by unique address+value match when vin.vout is missing', () => {
      const index = resolveVinVoutIndex({
        vinValue: '5000',
        vinAddress: 'bc1qxyz',
        prevTxVouts: [
          { value: '5000', addresses: ['bc1qabc'] },
          { value: '5000', addresses: ['bc1qxyz'] },
        ],
      })

      expect(index).toBe(1)
    })

    it('returns undefined when there is no unique match', () => {
      const index = resolveVinVoutIndex({
        vinValue: '5000',
        vinAddress: 'bc1qnomatch',
        prevTxVouts: [{ value: '5000' }, { value: '5000' }],
      })

      expect(index).toBeUndefined()
    })
  })

})

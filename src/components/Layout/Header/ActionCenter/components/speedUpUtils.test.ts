import { Transaction } from '@shapeshiftoss/bitcoinjs-lib'
import { describe, expect, it, vi } from 'vitest'

import {
  getDisplayFeeRateSatPerVb,
  getDisplayFeeRateSatPerVbPrecise,
  getTxFeeRateSatPerVb,
  getTxFeeRateSatPerVbPrecise,
  getTxFeeSats,
  getTxIdFromHex,
  getTxVsize,
  isLikelyBitcoinTxId,
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

  describe('txid helpers', () => {
    it('extracts txid from signed tx hex', () => {
      const txid = getTxIdFromHex(
        '0100000000010105abd41ac558c186429b77a2344106bdd978955fc407e3363239864cb479b9ad0000000000fdffffff02900100000000000016001408450440a15ea38314c52d5c9ae6201857d7cf7a677a000000000000160014bf44db911ae5acc9cffcc1bbb9622ddda4a1112b024730440220261bd026ab75ed19ee9b537204c38953593d37b1f1819fdcedfc9e494ae8503902204f38ac8cbf3145e83bc0578866fd4508fcc97bb57d70b6688253558639a8a4a50121029dc27a53da073b1fea5601cf370d02d3b33cf572156c3a6df9d5c03c5dbcdcd700000000',
      )

      expect(txid).toBe('04a551347291f60a37a632243ed4d4b5320e1269148a02bb55fdc678d7c84a0f')
    })

    it('validates bitcoin txid format', () => {
      expect(
        isLikelyBitcoinTxId('35f171f3008a45a9071c4f1a8a75c95debc4ad438dc8453b93f25ea43d7ab1e4'),
      ).toBe(true)
      expect(isLikelyBitcoinTxId('not-a-txid')).toBe(false)
    })
  })
})

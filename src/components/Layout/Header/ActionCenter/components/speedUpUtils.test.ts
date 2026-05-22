import { Transaction } from '@shapeshiftoss/bitcoinjs-lib'
import { describe, expect, it, vi } from 'vitest'

import {
  classifyOriginalOutputs,
  getDisplayFeeRateSatPerVb,
  getDisplayFeeRateSatPerVbPrecise,
  getTxFeeRateSatPerVb,
  getTxFeeRateSatPerVbPrecise,
  getTxFeeSats,
  getTxVsize,
  reconstructReplacementInputs,
  resolveVinVoutIndex,
  toSats,
} from './speedUpUtils'

const RECEIVE_PATH_13 = [2147483732, 2147483648, 2147483648, 0, 13] // m/84'/0'/0'/0/13
const CHANGE_PATH_10 = [2147483732, 2147483648, 2147483648, 1, 10] // m/84'/0'/0'/1/10
const CHANGE_PATH_11 = [2147483732, 2147483648, 2147483648, 1, 11] // m/84'/0'/0'/1/11

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

  describe('classifyOriginalOutputs', () => {
    it('classifies external send + change correctly', () => {
      const result = classifyOriginalOutputs({
        vouts: [
          { value: '1317', addresses: ['bc1qexternal'] },
          { value: '3295', addresses: ['bc1qchange'] },
        ],
        ownedAddressMap: new Map([['bc1qchange', CHANGE_PATH_11]]),
      })

      expect(result).toEqual([
        { address: 'bc1qexternal', amount: '1317', isChange: false },
        { address: 'bc1qchange', amount: '3295', isChange: true },
      ])
    })

    it('treats owned receive-chain address as a payment (self-send)', () => {
      const result = classifyOriginalOutputs({
        vouts: [
          { value: '1317', addresses: ['bc1qownreceive'] },
          { value: '3295', addresses: ['bc1qownchange'] },
        ],
        ownedAddressMap: new Map([
          ['bc1qownreceive', RECEIVE_PATH_13],
          ['bc1qownchange', CHANGE_PATH_11],
        ]),
      })

      expect(result).toEqual([
        { address: 'bc1qownreceive', amount: '1317', isChange: false },
        { address: 'bc1qownchange', amount: '3295', isChange: true },
      ])
    })

    it('marks vouts with no address as not change (e.g. OP_RETURN)', () => {
      const result = classifyOriginalOutputs({
        vouts: [{ value: '0', addresses: undefined }],
        ownedAddressMap: new Map(),
      })

      expect(result).toEqual([{ address: undefined, amount: '0', isChange: false }])
    })

    it('treats every vout as a payment when the owned map is empty', () => {
      const result = classifyOriginalOutputs({
        vouts: [
          { value: '1000', addresses: ['bc1qa'] },
          { value: '2000', addresses: ['bc1qb'] },
        ],
        ownedAddressMap: new Map(),
      })

      expect(result.every(r => r.isChange === false)).toBe(true)
    })

    it('classifies multiple change outputs as change', () => {
      const result = classifyOriginalOutputs({
        vouts: [
          { value: '1000', addresses: ['bc1qchange1'] },
          { value: '2000', addresses: ['bc1qchange2'] },
        ],
        ownedAddressMap: new Map([
          ['bc1qchange1', CHANGE_PATH_10],
          ['bc1qchange2', CHANGE_PATH_11],
        ]),
      })

      expect(result.map(r => r.isChange)).toEqual([true, true])
    })

    it('defaults missing vout value to "0"', () => {
      const result = classifyOriginalOutputs({
        vouts: [{ addresses: ['bc1qa'] }],
        ownedAddressMap: new Map(),
      })

      expect(result[0].amount).toBe('0')
    })
  })

  describe('reconstructReplacementInputs', () => {
    const prevTx = {
      hex: 'deadbeef',
      vout: [
        { value: '1000', addresses: ['bc1qotheroutput'] },
        { value: '4838', addresses: ['bc1qchange'] },
      ],
    }

    it('uses metadata addressNList when present', () => {
      const result = reconstructReplacementInputs({
        vins: [{ txid: 'abc', vout: 1, value: '4838', addresses: ['bc1qchange'] }],
        prevTxs: [prevTx],
        ownedAddressMap: new Map([['bc1qchange', CHANGE_PATH_11]]),
        metadata: { inputs: [{ addressNList: CHANGE_PATH_10 }] },
      })

      expect(result[0].addressNList).toEqual(CHANGE_PATH_10)
    })

    it('falls back to owned-address map when metadata is absent', () => {
      const result = reconstructReplacementInputs({
        vins: [{ txid: 'abc', vout: 1, value: '4838', addresses: ['bc1qchange'] }],
        prevTxs: [prevTx],
        ownedAddressMap: new Map([['bc1qchange', CHANGE_PATH_10]]),
      })

      expect(result[0].addressNList).toEqual(CHANGE_PATH_10)
    })

    it('falls back to owned-address map when metadata input has no addressNList', () => {
      const result = reconstructReplacementInputs({
        vins: [{ txid: 'abc', vout: 1, value: '4838', addresses: ['bc1qchange'] }],
        prevTxs: [prevTx],
        ownedAddressMap: new Map([['bc1qchange', CHANGE_PATH_10]]),
        metadata: { inputs: [{}] },
      })

      expect(result[0].addressNList).toEqual(CHANGE_PATH_10)
    })

    it('throws when neither metadata nor the owned-address map covers the vin', () => {
      expect(() =>
        reconstructReplacementInputs({
          vins: [{ txid: 'abc', vout: 1, value: '4838', addresses: ['bc1qunknown'] }],
          prevTxs: [prevTx],
          ownedAddressMap: new Map(),
        }),
      ).toThrow(/bc1qunknown/)
    })

    it('throws when vin.vout cannot be resolved', () => {
      expect(() =>
        reconstructReplacementInputs({
          vins: [{ txid: 'abc', value: '9999' }],
          prevTxs: [prevTx],
          ownedAddressMap: new Map(),
        }),
      ).toThrow(/abc/)
    })

    it('uses vin.value when present, otherwise falls back to prevTx vout value', () => {
      const result = reconstructReplacementInputs({
        vins: [
          { txid: 'abc', vout: 1, addresses: ['bc1qchange'] },
          { txid: 'def', vout: 0, value: '7777', addresses: ['bc1qchange'] },
        ],
        prevTxs: [prevTx, prevTx],
        ownedAddressMap: new Map([['bc1qchange', CHANGE_PATH_10]]),
      })

      expect(result[0].amount).toBe('4838') // from prevTx.vout[1].value
      expect(result[1].amount).toBe('7777') // from vin.value
    })

    it('preserves txid and previous-tx hex on each input', () => {
      const result = reconstructReplacementInputs({
        vins: [{ txid: 'abc', vout: 1, value: '4838', addresses: ['bc1qchange'] }],
        prevTxs: [prevTx],
        ownedAddressMap: new Map([['bc1qchange', CHANGE_PATH_10]]),
      })

      expect(result[0].txid).toBe('abc')
      expect(result[0].vout).toBe(1)
      expect(result[0].hex).toBe('deadbeef')
    })

    it('resolves each vin independently across multiple inputs (metadata indexed by vin position)', () => {
      const prevTxA = {
        hex: 'aaaa',
        vout: [{ value: '1000', addresses: ['bc1qa'] }],
      }
      const prevTxB = {
        hex: 'bbbb',
        vout: [{ value: '2000', addresses: ['bc1qb'] }],
      }

      const result = reconstructReplacementInputs({
        vins: [
          { txid: 'tx-a', vout: 0, value: '1000', addresses: ['bc1qa'] },
          { txid: 'tx-b', vout: 0, value: '2000', addresses: ['bc1qb'] },
        ],
        prevTxs: [prevTxA, prevTxB],
        ownedAddressMap: new Map([['bc1qb', CHANGE_PATH_11]]),
        metadata: { inputs: [{ addressNList: CHANGE_PATH_10 }, {}] },
      })

      expect(result[0]).toMatchObject({ txid: 'tx-a', hex: 'aaaa', addressNList: CHANGE_PATH_10 })
      expect(result[1]).toMatchObject({ txid: 'tx-b', hex: 'bbbb', addressNList: CHANGE_PATH_11 })
    })

    it('falls back to the owned map when metadata addressNList is an empty array', () => {
      const result = reconstructReplacementInputs({
        vins: [{ txid: 'abc', vout: 1, value: '4838', addresses: ['bc1qchange'] }],
        prevTxs: [prevTx],
        ownedAddressMap: new Map([['bc1qchange', CHANGE_PATH_10]]),
        metadata: { inputs: [{ addressNList: [] }] },
      })

      expect(result[0].addressNList).toEqual(CHANGE_PATH_10)
    })
  })
})

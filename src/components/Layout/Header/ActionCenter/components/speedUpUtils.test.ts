import { Transaction } from '@shapeshiftoss/bitcoinjs-lib'
import { BTCOutputAddressType, BTCOutputScriptType } from '@shapeshiftoss/hdwallet-core'
import { describe, expect, it, vi } from 'vitest'

import type { ReconstructedOutput } from './speedUpUtils'
import {
  buildReplacementOutputs,
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

import { bn } from '@/lib/bignumber/bignumber'

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

    it('preserves OP_RETURN data on the vout', () => {
      const result = classifyOriginalOutputs({
        vouts: [
          { value: '1000', addresses: ['bc1qpayment'] },
          { value: '0', opReturn: 's:ETH.USDC:0xabc:42' },
        ],
        ownedAddressMap: new Map(),
      })

      expect(result[0].opReturn).toBeUndefined()
      expect(result[1].opReturn).toBe('s:ETH.USDC:0xabc:42')
      expect(result[1].address).toBeUndefined()
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

  describe('buildReplacementOutputs', () => {
    const CHANGE_NLIST = [2147483732, 2147483648, 2147483648, 1, 12]
    const DUST = 546

    const spend = (overrides: Partial<ReconstructedOutput> = {}): ReconstructedOutput => ({
      address: 'bc1qpayment',
      amount: '10000',
      isChange: false,
      ...overrides,
    })
    const change = (overrides: Partial<ReconstructedOutput> = {}): ReconstructedOutput => ({
      address: 'bc1qchange',
      amount: '5000',
      isChange: true,
      ...overrides,
    })
    const opReturn = (data = 'memo'): ReconstructedOutput => ({
      amount: '0',
      isChange: false,
      opReturn: data,
    })

    const baseArgs = {
      newChangeSats: bn(4500),
      changeAddressNList: CHANGE_NLIST,
      changeScriptType: BTCOutputScriptType.PayToWitness,
      dustThreshold: DUST,
    }

    const expectSuccess = (result: ReturnType<typeof buildReplacementOutputs>) => {
      if ('error' in result) {
        throw new Error(`expected success, got error: ${result.error}`)
      }
      return result
    }

    it('emits Spend and Change in original order with the new change amount', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          outputs: [spend(), change()],
        }),
      )

      expect(result.opReturnData).toBeUndefined()
      expect(result.outputs).toEqual([
        { addressType: BTCOutputAddressType.Spend, address: 'bc1qpayment', amount: '10000' },
        {
          addressType: BTCOutputAddressType.Change,
          addressNList: CHANGE_NLIST,
          scriptType: BTCOutputScriptType.PayToWitness,
          amount: '4500',
          isChange: true,
        },
      ])
    })

    it('preserves order when change is first', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          outputs: [change(), spend()],
        }),
      )

      expect(result.outputs[0].addressType).toBe(BTCOutputAddressType.Change)
      expect(result.outputs[1].addressType).toBe(BTCOutputAddressType.Spend)
    })

    it('lifts a single OP_RETURN to opReturnData and omits it from outputs', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          outputs: [spend({ address: 'bc1qvault' }), opReturn('s:ETH.USDC:0xabc'), change()],
        }),
      )

      expect(result.opReturnData).toBe('s:ETH.USDC:0xabc')
      expect(result.outputs).toHaveLength(2)
      expect(result.outputs[0]).toMatchObject({ address: 'bc1qvault' })
      expect(result.outputs[1]).toMatchObject({ isChange: true })
    })

    it('drops change below the dust threshold', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          newChangeSats: bn(545),
          outputs: [spend(), change()],
        }),
      )

      expect(result.outputs).toEqual([
        { addressType: BTCOutputAddressType.Spend, address: 'bc1qpayment', amount: '10000' },
      ])
    })

    it('drops change when newChangeSats is exactly at dust - 1', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          newChangeSats: bn(DUST - 1),
          outputs: [change()],
        }),
      )

      expect(result.outputs).toEqual([])
    })

    it('keeps change at exactly the dust threshold', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          newChangeSats: bn(DUST),
          outputs: [change()],
        }),
      )

      expect(result.outputs).toHaveLength(1)
      expect(result.outputs[0]).toMatchObject({ amount: String(DUST), isChange: true })
    })

    it('drops change when newChangeSats is negative', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          newChangeSats: bn(-100),
          outputs: [spend(), change()],
        }),
      )

      expect(result.outputs).toHaveLength(1)
      expect(result.outputs[0].addressType).toBe(BTCOutputAddressType.Spend)
    })

    it('returns the multipleChange translation key when the original tx has multiple change outputs', () => {
      const result = buildReplacementOutputs({
        ...baseArgs,
        outputs: [change({ address: 'bc1qchange1' }), change({ address: 'bc1qchange2' })],
      })

      expect(result).toEqual({ error: 'modals.send.speedUp.errors.multipleChange' })
    })

    it('returns the multipleOpReturn translation key when the original tx has multiple OP_RETURN outputs', () => {
      const result = buildReplacementOutputs({
        ...baseArgs,
        outputs: [spend(), opReturn('memo-a'), opReturn('memo-b'), change()],
      })

      expect(result).toEqual({ error: 'modals.send.speedUp.errors.multipleOpReturn' })
    })

    it('returns the addresslessOutput translation key on a non-OP_RETURN addressless output', () => {
      const result = buildReplacementOutputs({
        ...baseArgs,
        outputs: [spend({ address: undefined }), change()],
      })

      expect(result).toEqual({ error: 'modals.send.speedUp.errors.addresslessOutput' })
    })

    it('emits no change branch when the original tx has no change output', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          outputs: [
            spend({ address: 'bc1qa', amount: '1000' }),
            spend({ address: 'bc1qb', amount: '2000' }),
          ],
        }),
      )

      expect(result.outputs).toEqual([
        { addressType: BTCOutputAddressType.Spend, address: 'bc1qa', amount: '1000' },
        { addressType: BTCOutputAddressType.Spend, address: 'bc1qb', amount: '2000' },
      ])
    })

    it('preserves the original spend amount and ignores newChangeSats for non-change outputs', () => {
      const result = expectSuccess(
        buildReplacementOutputs({
          ...baseArgs,
          newChangeSats: bn(99999),
          outputs: [spend({ amount: '7777' })],
        }),
      )

      expect(result.outputs[0]).toMatchObject({ amount: '7777' })
    })
  })
})

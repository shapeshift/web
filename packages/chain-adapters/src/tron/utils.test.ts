import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getTronContractCallBandwidthBytes,
  getTronFeeLimit,
  toRawJsonInt,
  toTronBase58,
  toTronHex,
} from './utils'

const BASE58 = 'TAfbit1ENsRmtZbPQfYU3srURpfYuWYS7K'
const HEX_41 = '4107a39ae4c49dee86e892450b20881f32cd5d500d'
const HEX_0X = '0x07a39ae4c49dee86e892450b20881f32cd5d500d'

describe('toTronBase58', () => {
  it('passes base58 through', () => expect(toTronBase58(BASE58)).toBe(BASE58))
  it('decodes 41-prefixed hex', () => expect(toTronBase58(HEX_41)).toBe(BASE58))
  it('decodes 0x + 41-prefixed hex', () => expect(toTronBase58(`0x${HEX_41}`)).toBe(BASE58))
  it('decodes a bare 0x 20-byte body', () => expect(toTronBase58(HEX_0X)).toBe(BASE58))
})

describe('toTronHex', () => {
  it('encodes base58 as the 0x 20-byte body', () =>
    expect(toTronHex(BASE58).toLowerCase()).toBe(HEX_0X))
  it('swaps a 41 prefix for 0x', () => expect(toTronHex(HEX_41).toLowerCase()).toBe(HEX_0X))
  it('passes 0x hex through', () => expect(toTronHex(HEX_0X)).toBe(HEX_0X))
  it('keeps a bare 20-byte body whose first byte is 0x41', () =>
    expect(toTronHex(`41${'ab'.repeat(19)}`)).toBe(`0x41${'ab'.repeat(19)}`))
})

describe('getTronFeeLimit', () => {
  it('triples the estimate', () => expect(getTronFeeLimit('8059200')).toBe(24_177_600))
  it('floors a near-free call at 10 TRX', () => expect(getTronFeeLimit('636000')).toBe(10_000_000))
  it('caps at the standard 100 TRX limit', () =>
    expect(getTronFeeLimit('54100000')).toBe(100_000_000))
  it('keeps 1.5x headroom past the standard limit', () =>
    expect(getTronFeeLimit('252000000')).toBe(378_000_000))
  it('falls back to the standard limit without an estimate', () => {
    expect(getTronFeeLimit(undefined)).toBe(100_000_000)
    expect(getTronFeeLimit('0')).toBe(100_000_000)
    expect(getTronFeeLimit('nope')).toBe(100_000_000)
  })
})

describe('getTronContractCallBandwidthBytes', () => {
  it('sizes the calldata plus the signed TriggerSmartContract envelope', () => {
    expect(getTronContractCallBandwidthBytes('0x2213bc0b')).toBe(4 + 279)
    expect(getTronContractCallBandwidthBytes('2213bc0b')).toBe(4 + 279)
  })
})

describe('toRawJsonInt', () => {
  const json = JSON as { rawJSON?: (text: string) => unknown }
  const rawJSON = json.rawJSON

  afterEach(() => {
    Object.defineProperty(JSON, 'rawJSON', {
      value: rawJSON,
      configurable: true,
      writable: true,
    })
  })

  it('serializes digits beyond the safe integer range untouched', () => {
    expect(JSON.stringify({ amount: toRawJsonInt('9007199254740993') })).toBe(
      '{"amount":9007199254740993}',
    )
  })

  it('rejects text that is not a bare integer', () => {
    expect(() => toRawJsonInt('1e3')).toThrow('1e3')
    expect(() => toRawJsonInt('9007199254740990.2')).toThrow('9007199254740990.2')
    expect(() => toRawJsonInt('-1')).toThrow('-1')
  })

  it('treats an empty value as zero', () => {
    expect(JSON.stringify({ amount: toRawJsonInt('') })).toBe('{"amount":0}')
  })

  it('drops leading zeros, which JSON numbers cannot carry', () => {
    expect(JSON.stringify({ amount: toRawJsonInt('007') })).toBe('{"amount":7}')
    expect(JSON.stringify({ amount: toRawJsonInt('000') })).toBe('{"amount":0}')
  })

  describe('without JSON.rawJSON', () => {
    beforeEach(() => {
      Object.defineProperty(JSON, 'rawJSON', {
        value: undefined,
        configurable: true,
        writable: true,
      })
    })

    it('falls back to a number inside the safe integer range', () => {
      expect(JSON.stringify({ amount: toRawJsonInt('1000000') })).toBe('{"amount":1000000}')
    })

    it('drops leading zeros', () => {
      expect(JSON.stringify({ amount: toRawJsonInt('007') })).toBe('{"amount":7}')
    })

    it('throws rather than truncate beyond the safe integer range', () => {
      expect(() => toRawJsonInt('9007199254740993')).toThrow('9007199254740993')
    })
  })
})

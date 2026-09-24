import { describe, expect, it } from 'vitest'

import {
  getTronContractCallBandwidthBytes,
  getTronFeeLimit,
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
  it('doubles the estimate', () => expect(getTronFeeLimit('8059200')).toBe('16118400'))
  it('falls back to the standard limit without an estimate', () => {
    expect(getTronFeeLimit(undefined)).toBe('100000000')
    expect(getTronFeeLimit('0')).toBe('100000000')
    expect(getTronFeeLimit('nope')).toBe('100000000')
  })
  it('never exceeds the chain ceiling', () =>
    expect(getTronFeeLimit('10000000000000')).toBe('15000000000'))
})

describe('getTronContractCallBandwidthBytes', () => {
  it('sizes the calldata plus the signed TriggerSmartContract envelope', () => {
    expect(getTronContractCallBandwidthBytes('0x2213bc0b')).toBe(4 + 279)
    expect(getTronContractCallBandwidthBytes('2213bc0b')).toBe(4 + 279)
  })
})

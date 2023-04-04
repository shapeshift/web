import type { BIP44Params } from '@shapeshiftoss/types'

import { fromAddressNList, fromPath, toAddressNList, toPath } from './utils'

describe('fromPath', () => {
  it('can create BIP44Params from a path', () => {
    const result = fromPath("m/84'/0'/0'/0/0")
    const expected: BIP44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      index: 0,
    }
    expect(result).toEqual(expected)
  })
})

describe('toPath', () => {
  it('can create a path from BIP44Params', () => {
    const bip44Params: BIP44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      index: 0,
    }
    const result = toPath(bip44Params)
    const expected = "m/84'/0'/0'/0/0"
    expect(result).toEqual(expected)
  })
})

describe('toAddressNList', () => {
  it('can create a path from BIP44Params', () => {
    const bip44Params: BIP44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      index: 0,
    }
    const result = toAddressNList(bip44Params)
    const expected = [2147483732, 2147483648, 2147483648, 0, 0]
    expect(result).toEqual(expected)
  })
})

describe('fromAddressNList', () => {
  it('can create a path from BIP44Params', () => {
    const result = fromAddressNList([2147483732, 2147483648, 2147483648, 0, 0])
    const expected: BIP44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      index: 0,
    }
    expect(result).toEqual(expected)
  })
})

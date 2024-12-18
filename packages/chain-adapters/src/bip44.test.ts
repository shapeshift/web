import type { Bip44Params } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { fromAddressNList, fromPath, toAddressNList, toPath } from './utils'

describe('fromPath', () => {
  it('can create Bip44Params from a path (5 parts)', () => {
    const result = fromPath("m/84'/0'/0'/0/0")
    const expected: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      addressIndex: 0,
    }
    expect(result).toEqual(expected)
  })

  it('can create Bip44Params from a path (4 parts)', () => {
    const result = fromPath("m/84'/0'/0'/0")
    const expected: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      addressIndex: undefined,
    }
    expect(result).toEqual(expected)
  })

  it('can create Bip44Params from a path (3 parts)', () => {
    const result = fromPath("m/84'/0'/0'")
    const expected: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: undefined,
      addressIndex: undefined,
    }
    expect(result).toEqual(expected)
  })

  it('should throw on invalid number of parts', () => {
    expect(() => fromPath("m/84'/0'")).toThrow()
    expect(() => fromPath("m/84'/0'/0'/0/0/0")).toThrow()
  })
})

describe('toPath', () => {
  it('can create a path from Bip44Params (5 parts)', () => {
    const bip44Params: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      addressIndex: 0,
    }
    const result = toPath(bip44Params)
    const expected = "m/84'/0'/0'/0/0"
    expect(result).toEqual(expected)
  })

  it('can create a path from Bip44Params (4 parts)', () => {
    const bip44Params: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      addressIndex: undefined,
    }
    const result = toPath(bip44Params)
    const expected = "m/84'/0'/0'/0"
    expect(result).toEqual(expected)
  })

  it('can create a path from Bip44Params (3 parts)', () => {
    let bip44Params: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: undefined,
      addressIndex: undefined,
    }
    let result = toPath(bip44Params)
    let expected = "m/84'/0'/0'"
    expect(result).toEqual(expected)

    bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: undefined,
      addressIndex: 0,
    }
    result = toPath(bip44Params)
    expected = "m/84'/0'/0'"
    expect(result).toEqual(expected)
  })
})

describe('toAddressNList', () => {
  it('can create a path from Bip44Params', () => {
    const bip44Params: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      addressIndex: 0,
    }
    const result = toAddressNList(bip44Params)
    const expected = [2147483732, 2147483648, 2147483648, 0, 0]
    expect(result).toEqual(expected)
  })
})

describe('fromAddressNList', () => {
  it('can create a path from Bip44Params', () => {
    const result = fromAddressNList([2147483732, 2147483648, 2147483648, 0, 0])
    const expected: Bip44Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      addressIndex: 0,
    }
    expect(result).toEqual(expected)
  })
})

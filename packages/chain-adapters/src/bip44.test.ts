import { BIP44Params } from '@shapeshiftoss/types'

import { fromPath, toPath } from './utils/bip44'

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

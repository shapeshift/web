import { BIP32Params } from '@shapeshiftoss/types'

import { fromPath, toPath } from './utils/bip32'

describe('fromPath', () => {
  it('can create BIP32Params from a path', () => {
    const result = fromPath("m/84'/0'/0'/0/0")
    const expected: BIP32Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      index: 0
    }
    expect(result).toEqual(expected)
  })
})

describe('toPath', () => {
  it('can create a path from BIP32Params', () => {
    const bip32Params: BIP32Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      index: 0
    }
    const result = toPath(bip32Params)
    const expected = "m/84'/0'/0'/0/0"
    expect(result).toEqual(expected)
  })
})

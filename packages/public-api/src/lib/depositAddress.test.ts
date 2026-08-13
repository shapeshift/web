import { SwapperName } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import { isDepositAddressSwapper } from './depositAddress'

describe('isDepositAddressSwapper', () => {
  it('is true for chainflip', () => {
    expect(isDepositAddressSwapper(SwapperName.Chainflip)).toBe(true)
  })

  it('is true for near intents', () => {
    expect(isDepositAddressSwapper(SwapperName.NearIntents)).toBe(true)
  })

  it('is false for relay', () => {
    expect(isDepositAddressSwapper(SwapperName.Relay)).toBe(false)
  })

  it('is false for an unknown swapper name', () => {
    expect(isDepositAddressSwapper('Not A Swapper')).toBe(false)
  })
})

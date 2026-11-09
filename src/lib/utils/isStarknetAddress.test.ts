import { describe, expect, it } from 'vitest'

import { isContractAddress } from './isContractAddress'
import { isStarknetAddress } from './isStarknetAddress'

const STARKNET_USDC = '0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb'

describe('isStarknetAddress', () => {
  it('accepts a full and an unpadded Starknet address', () => {
    expect(isStarknetAddress(STARKNET_USDC)).toBe(true)
    expect(isStarknetAddress(STARKNET_USDC.replace('0x0', '0x'))).toBe(true)
  })

  it('rejects EVM addresses and partial hex', () => {
    expect(isStarknetAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBe(false)
    expect(isStarknetAddress('0x0330')).toBe(false)
  })

  it('counts as a contract address search', () => {
    expect(isContractAddress(STARKNET_USDC)).toBe(true)
  })
})

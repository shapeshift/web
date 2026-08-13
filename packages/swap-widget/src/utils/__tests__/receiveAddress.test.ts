import { describe, expect, it } from 'vitest'

import type { ChainId } from '../../types'
import { resolveReceiveAddress } from '../receiveAddress'

const BTC_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93' as ChainId
const ETH_CHAIN_ID = 'eip155:1' as ChainId

const BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
const EVM_ADDRESS = '0x41b4D81dD40c6c91d21f686Bb0596E37e4C8cb90'
const WALLET_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const args = {
  isLocked: false,
  defaultAddress: undefined,
  customAddress: '',
  walletAddress: WALLET_ADDRESS,
  buyChainId: ETH_CHAIN_ID,
}

describe('resolveReceiveAddress', () => {
  describe('locked', () => {
    it('uses an address valid for the buy chain', () => {
      expect(resolveReceiveAddress({ ...args, isLocked: true, defaultAddress: EVM_ADDRESS })).toBe(
        EVM_ADDRESS,
      )
    })

    // The wallet is the user's own - paying it instead of the address the integrator set would send
    // the funds somewhere nobody asked for
    it('blocks rather than falling back when the address is for another chain', () => {
      expect(
        resolveReceiveAddress({
          ...args,
          isLocked: true,
          defaultAddress: EVM_ADDRESS,
          buyChainId: BTC_CHAIN_ID,
        }),
      ).toBeUndefined()
    })

    it('blocks on an empty address', () => {
      expect(resolveReceiveAddress({ ...args, isLocked: true, defaultAddress: '' })).toBeUndefined()
    })

    it('blocks on a malformed address', () => {
      expect(
        resolveReceiveAddress({ ...args, isLocked: true, defaultAddress: '0xnope' }),
      ).toBeUndefined()
    })

    it('ignores anything the user typed', () => {
      expect(
        resolveReceiveAddress({
          ...args,
          isLocked: true,
          defaultAddress: EVM_ADDRESS,
          customAddress: WALLET_ADDRESS,
        }),
      ).toBe(EVM_ADDRESS)
    })
  })

  describe('unlocked', () => {
    it('prefers a valid entry over the wallet', () => {
      expect(resolveReceiveAddress({ ...args, customAddress: EVM_ADDRESS })).toBe(EVM_ADDRESS)
    })

    it('falls back to the wallet when the entry is for another chain', () => {
      expect(
        resolveReceiveAddress({
          ...args,
          customAddress: BTC_ADDRESS,
          walletAddress: undefined,
          buyChainId: ETH_CHAIN_ID,
        }),
      ).toBeUndefined()
    })

    it('falls back to the wallet with nothing entered', () => {
      expect(resolveReceiveAddress(args)).toBe(WALLET_ADDRESS)
    })
  })
})

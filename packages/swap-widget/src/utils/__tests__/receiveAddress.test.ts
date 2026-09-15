import { describe, expect, it } from 'vitest'

import type { ChainId } from '../../types'
import { UTXO_CHAIN_IDS } from '../../types'
import { resolveReceiveAddress } from '../receiveAddress'

const BTC_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93' as ChainId
const BCH_CHAIN_ID = 'bip122:000000000000000000651ef99cb9fcbe' as ChainId
const ETH_CHAIN_ID = 'eip155:1' as ChainId
const ARBITRUM_CHAIN_ID = 'eip155:42161' as ChainId

const BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
const EVM_ADDRESS = '0x41b4D81dD40c6c91d21f686Bb0596E37e4C8cb90'
const WALLET_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const args = {
  isLocked: false,
  defaultAddress: undefined,
  defaultAddressChainId: ETH_CHAIN_ID,
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

    // Falling back would pay the user's own wallet instead of the address the integrator set
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

    it('keeps an evm address across evm chains', () => {
      expect(
        resolveReceiveAddress({
          ...args,
          isLocked: true,
          defaultAddress: EVM_ADDRESS,
          buyChainId: ARBITRUM_CHAIN_ID,
        }),
      ).toBe(EVM_ADDRESS)
    })

    it('blocks a bitcoin address on bitcoin cash even though the format is shared', () => {
      expect(
        resolveReceiveAddress({
          ...args,
          isLocked: true,
          defaultAddress: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
          defaultAddressChainId: BTC_CHAIN_ID,
          buyChainId: BCH_CHAIN_ID,
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
      expect(resolveReceiveAddress({ ...args, customAddress: BTC_ADDRESS })).toBe(WALLET_ADDRESS)
    })

    it('has no address when the entry is unusable and no wallet is connected', () => {
      expect(
        resolveReceiveAddress({ ...args, customAddress: BTC_ADDRESS, walletAddress: undefined }),
      ).toBeUndefined()
    })

    it('falls back to the wallet with nothing entered', () => {
      expect(resolveReceiveAddress(args)).toBe(WALLET_ADDRESS)
    })
  })
})

describe('resolveReceiveAddress cross-chain wallet', () => {
  it('never returns a wallet address the buy chain would reject', () => {
    expect(
      resolveReceiveAddress({
        ...args,
        customAddress: '',
        walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        buyChainId: UTXO_CHAIN_IDS.dogecoin,
      }),
    ).toBeUndefined()
  })
})

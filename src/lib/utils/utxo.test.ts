import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { isUtxoAccountId, isUtxoChainId } from './utxo'

describe('utxo utils', () => {
  describe('isUtxoAccountId', () => {
    it('returns true for BTC account', () => {
      const accountId: AccountId = 'bip122:000000000019d6689c085ae165831e93:xpub123'
      expect(isUtxoAccountId(accountId)).toBe(true)
    })

    it('returns false for ETH account', () => {
      const accountId: AccountId = 'eip155:1:0x1234567890abcdef1234567890abcdef12345678'
      expect(isUtxoAccountId(accountId)).toBe(false)
    })

    it('returns false for Cosmos account', () => {
      const accountId: AccountId = 'cosmos:cosmoshub-4:cosmos1abc123'
      expect(isUtxoAccountId(accountId)).toBe(false)
    })
  })

  describe('isUtxoChainId', () => {
    it('returns true for BTC chainId', () => {
      const chainId: ChainId = 'bip122:000000000019d6689c085ae165831e93'
      expect(isUtxoChainId(chainId)).toBe(true)
    })

    it('returns false for ETH chainId', () => {
      const chainId: ChainId = 'eip155:1'
      expect(isUtxoChainId(chainId)).toBe(false)
    })

    it('returns false for Cosmos chainId', () => {
      const chainId: ChainId = 'cosmos:cosmoshub-4'
      expect(isUtxoChainId(chainId)).toBe(false)
    })
  })
})

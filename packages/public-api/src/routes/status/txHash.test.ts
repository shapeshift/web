import { describe, expect, it, vi } from 'vitest'

import type { StoredQuote } from '../../lib/quoteStore'
import { normalizeTxHash } from './txHash'
import { statusErrors, validateTxHash } from './utils'

// the route's asset and swap-service clients load chain adapters, which nothing here needs
vi.mock('../../assets', () => ({ getAsset: vi.fn() }))
vi.mock('../../env', () => ({ env: {} }))
vi.mock('../../lib/fetchSwapService', () => ({
  callSwapService: vi.fn(),
  fetchSwapService: vi.fn(),
}))

const HEX = '4a4ce957a047378c3f3ac57ca3cc3ab03e61814a7b415f493704d84a9e42d0eb'
const SOLANA_SIGNATURE =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'

const ETHEREUM = 'eip155:1'
const BITCOIN = 'bip122:000000000019d6689c085ae165831e93'
const THORCHAIN = 'cosmos:thorchain-1'
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
const TRON = 'tron:0x2b6653dc'
const NEAR = 'near:mainnet'
const STARKNET = 'starknet:SN_MAIN'

describe('normalizeTxHash', () => {
  it.each([`0x${HEX}`, `0x${HEX.toUpperCase()}`, HEX, ` 0X${HEX} `])(
    'spells every variant of an EVM hash the same: %s',
    hash => {
      expect(normalizeTxHash(ETHEREUM, hash)).toBe(`0x${HEX}`)
    },
  )

  it.each([
    [BITCOIN, HEX],
    [TRON, HEX],
    [THORCHAIN, HEX.toUpperCase()],
  ])('takes the usual form of a %s hash', (chainId, expected) => {
    for (const hash of [HEX, HEX.toUpperCase(), `0x${HEX}`]) {
      expect(normalizeTxHash(chainId, hash)).toBe(expected)
    }
  })

  it.each([
    [ETHEREUM, `0x${HEX.slice(2)}`],
    [ETHEREUM, `0x${HEX}00`],
    [ETHEREUM, SOLANA_SIGNATURE],
    [BITCOIN, 'not-a-hash'],
    [THORCHAIN, `${HEX.slice(1)}g`],
    [SOLANA, HEX],
    [SOLANA, `${SOLANA_SIGNATURE.slice(1)}0`],
    [NEAR, 'short'],
    [STARKNET, HEX],
    ['unknown:chain', HEX],
  ])('rejects a hash that cannot be one on %s: %s', (chainId, hash) => {
    expect(normalizeTxHash(chainId, hash)).toBeUndefined()
  })

  it('keeps a base58 signature as given', () => {
    expect(normalizeTxHash(SOLANA, SOLANA_SIGNATURE)).toBe(SOLANA_SIGNATURE)
  })

  it('lowercases a Starknet hash without padding it', () => {
    expect(normalizeTxHash(STARKNET, '0x0ABC')).toBe('0x0abc')
  })
})

describe('validateTxHash', () => {
  const storedQuote = { sellAssetId: `${ETHEREUM}/slip44:60` } as StoredQuote

  it('rejects a hash in the wrong format for the sell chain', () => {
    expect(validateTxHash(storedQuote, SOLANA_SIGNATURE)).toBe(statusErrors.INVALID_TX_HASH)
  })

  it('accepts a well formed hash', () => {
    expect(validateTxHash(storedQuote, `0x${HEX}`)).toBeUndefined()
  })

  it('treats another spelling of the bound hash as the same hash', () => {
    const bound = { ...storedQuote, txHash: `0x${HEX}` }

    expect(validateTxHash(bound, HEX.toUpperCase())).toBeUndefined()
  })

  it('rejects a different hash once one is bound', () => {
    const bound = { ...storedQuote, txHash: `0x${HEX}` }

    expect(validateTxHash(bound, `0x${'1'.repeat(64)}`)).toBe(statusErrors.TX_HASH_MISMATCH)
  })

  it('still requires a hash for a quote that is not paid externally', () => {
    expect(validateTxHash(storedQuote, undefined)).toBe(statusErrors.TX_HASH_REQUIRED)
  })
})

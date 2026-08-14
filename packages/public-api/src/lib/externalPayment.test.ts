import { SwapperName } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import { bindSellTxHash, isExternalPaymentSwapper, requiresTxHashToTrack } from './externalPayment'
import type { StoredQuote } from './quoteStore'

const makeStoredQuote = (overrides: Partial<StoredQuote>): StoredQuote =>
  ({
    quoteId: '3f1c9a58-5f4e-4a3f-9a0f-9d6b2b7c1a11',
    swapperName: SwapperName.Relay,
    sellAssetId: 'eip155:1/slip44:60',
    buyAssetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    sellAmountCryptoBaseUnit: '1000000000000000000',
    buyAmountAfterFeesCryptoBaseUnit: '3000000',
    sendAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    receiveAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    shapeshiftBps: '0',
    affiliateBps: '0',
    rate: '0.995',
    createdAt: 1_000,
    expiresAt: 100_000,
    metadata: { stepIndex: 0, quoteId: '3f1c9a58-5f4e-4a3f-9a0f-9d6b2b7c1a11' },
    status: 'pending',
    ...overrides,
  }) as StoredQuote

describe('isExternalPaymentSwapper', () => {
  it('is true for chainflip', () => {
    expect(isExternalPaymentSwapper(SwapperName.Chainflip)).toBe(true)
  })

  it('is true for near intents', () => {
    expect(isExternalPaymentSwapper(SwapperName.NearIntents)).toBe(true)
  })

  it('is false for relay', () => {
    expect(isExternalPaymentSwapper(SwapperName.Relay)).toBe(false)
  })

  it('is false for an unknown swapper name', () => {
    expect(isExternalPaymentSwapper('Not A Swapper')).toBe(false)
  })
})

describe('requiresTxHashToTrack', () => {
  it('requires a hash for a wallet-signed swapper', () => {
    expect(requiresTxHashToTrack(makeStoredQuote({}))).toBe(true)
  })

  it('does not require a hash for a deposit-address swapper', () => {
    const quote = makeStoredQuote({ swapperName: SwapperName.Chainflip })
    expect(requiresTxHashToTrack(quote)).toBe(false)
  })

  it('does not require a hash once one is already bound', () => {
    expect(requiresTxHashToTrack(makeStoredQuote({ txHash: '0xabc' }))).toBe(false)
  })
})

describe('bindSellTxHash', () => {
  it('binds the hash, marks the swap submitted and stamps registeredAt', () => {
    const quote = makeStoredQuote({ swapperName: SwapperName.Chainflip })
    const bound = bindSellTxHash(quote, '0xdead', 5_000)

    expect(bound.txHash).toBe('0xdead')
    expect(bound.status).toBe('submitted')
    expect(bound.registeredAt).toBe(5_000)
  })

  it('keeps an existing registeredAt', () => {
    const quote = makeStoredQuote({ swapperName: SwapperName.Chainflip, registeredAt: 42 })
    expect(bindSellTxHash(quote, '0xdead', 5_000).registeredAt).toBe(42)
  })
})

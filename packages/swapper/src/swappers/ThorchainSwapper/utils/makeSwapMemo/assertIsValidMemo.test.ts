import { bchChainId, btcChainId, ethChainId, thorchainChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { assertIsValidMemo, isValidMemoAddress } from './assertIsValidMemo'

describe('isValidMemoAddress', () => {
  it('should validate memo address', () => {
    expect(
      isValidMemoAddress(ethChainId, 'ETH.ETH', '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'),
    ).toBe(true)

    expect(
      isValidMemoAddress(
        bchChainId,
        'BCH.ETH',
        'bitcoincash:qpqze9nw77en2v4du4ud0d02t72qkafqe5nk8vrk7f',
      ),
    ).toBe(true)

    expect(
      isValidMemoAddress(
        thorchainChainId,
        'RUNE.ETH',
        'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw',
      ),
    ).toBe(true)
  })

  it('should fail memo address validation when chainId does not match', () => {
    expect(
      isValidMemoAddress(
        ethChainId,
        'BCH.ETH',
        'bitcoincash:qpqze9nw77en2v4du4ud0d02t72qkafqe5nk8vrk7f',
      ),
    ).toBe(false)

    expect(
      isValidMemoAddress(ethChainId, 'ETH.ETH', 'bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h'),
    ).toBe(false)

    expect(
      isValidMemoAddress(bchChainId, 'BCH.ETH', 'bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h'),
    ).toBe(false)
  })

  it('should fail memo address validation when address does not match', () => {
    expect(
      isValidMemoAddress(bchChainId, 'BCH.ETH', 'bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h'),
    ).toBe(false)
  })

  it('should fail memo address validation when chainId and address do not match', () => {
    expect(
      isValidMemoAddress(ethChainId, 'ETH.ETH', 'bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h'),
    ).toBe(false)
  })
})

describe('assertIsValidMemo', () => {
  it('should assert memo is valid', () => {
    const affiliateBps = '25'

    // bitcoin
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:25',
        btcChainId,
        affiliateBps,
      ),
    ).not.toThrow()

    // ethereum
    expect(() =>
      assertIsValidMemo(
        's:ETH.ETH:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:25',
        btcChainId,
        affiliateBps,
      ),
    ).not.toThrow()

    // eth chain - different token
    expect(() =>
      assertIsValidMemo(
        's:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:25',
        btcChainId,
        affiliateBps,
      ),
    ).not.toThrow()

    // zero affiliate bps
    expect(() =>
      assertIsValidMemo(
        's:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0',
        btcChainId,
        '0',
      ),
    ).not.toThrow()

    // different affiliate bps
    expect(() =>
      assertIsValidMemo(
        's:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:30',
        btcChainId,
        '30',
      ),
    ).not.toThrow()

    // streaming swap
    expect(() =>
      assertIsValidMemo(
        's:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420/10/5:ss:30',
        btcChainId,
        '30',
      ),
    ).not.toThrow()
  })

  it('should throw on invalid address with typos', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:zc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow('memo s:BTC.BTC:zc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0 invalid')
  })

  it('should throw on invalid address based on case sensitivity', () => {
    expect(() =>
      assertIsValidMemo(
        's:RUNE.BTC:Bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow('memo s:RUNE.BTC:Bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0 invalid')
  })

  it('should throw on wrong address for chain', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow('memo s:BTC.BTC:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0 invalid')
  })

  it('should throw on affiliate bps out of range', () => {
    expect(() =>
      assertIsValidMemo(
        's:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:9999',
        btcChainId,
        '9999',
      ),
    ).toThrow('affiliateBps 9999 is not a number between 0 and 1000')
  })

  it('should throw on incorrect affiliate id', () => {
    expect(() =>
      assertIsValidMemo(
        's:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:xx:10',
        btcChainId,
        '10',
      ),
    ).toThrow('affiliate xx is not ss')
  })

  it('should throw on missing streamingNumSwaps', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420//10:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow("streamingNumSwaps '' is not a valid number")
  })

  it('should throw on missing streamingNumBlocks', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420/5/:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow("streamingNumBlocks '' is not a valid number")
  })

  it('should throw on invalid streamingNumSwaps', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420/foo/10:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow("streamingNumSwaps 'foo' is not a valid number")
  })

  it('should throw on invalid streamingNumBlocks', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420/5/bar:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow("streamingNumBlocks 'bar' is not a valid number")
  })

  it('should throw on non-decimal streamingNumSwaps', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420/0x16/10:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow("streamingNumSwaps '0x16' is not a valid number")
  })

  it('should throw on non-decimal streamingNumBlocks', () => {
    expect(() =>
      assertIsValidMemo(
        's:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420/5/0x123:ss:0',
        btcChainId,
        '0',
      ),
    ).toThrow("streamingNumBlocks '0x123' is not a valid number")
  })
})

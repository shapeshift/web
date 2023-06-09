import { bchChainId, ethChainId, thorchainChainId } from '@shapeshiftoss/caip'

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
    expect(() =>
      assertIsValidMemo('s:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0'),
    ).not.toThrow()

    expect(() =>
      assertIsValidMemo('s:ETH.ETH:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0'),
    ).not.toThrow()

    expect(() =>
      assertIsValidMemo('s:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0'),
    ).not.toThrow()

    expect(() =>
      assertIsValidMemo('s:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:300'),
    ).not.toThrow()
  })

  it('should throw on invalid memo', () => {
    expect(() =>
      assertIsValidMemo('s:BTC.BTC:zc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0'),
    ).toThrow()

    expect(() =>
      assertIsValidMemo('s:RUNE.BTC:Bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0'),
    ).toThrow()

    expect(() =>
      assertIsValidMemo('s:BTC.BTC:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0'),
    ).toThrow()
    expect(() =>
      assertIsValidMemo('s:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:9999'),
    ).toThrow()
    expect(() =>
      assertIsValidMemo('s:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:xx:10'),
    ).toThrow()
  })
})

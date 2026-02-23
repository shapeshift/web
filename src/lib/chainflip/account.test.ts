import { blake2b } from 'blakejs'
import bs58 from 'bs58'
import { describe, expect, it, vi } from 'vitest'

import { ethAddressToScAccount, getChainflipAccountStatus, isAccountFunded } from './account'
import { CHAINFLIP_SS58_PREFIX } from './constants'
import { cfAccountInfoV2, cfFreeBalances } from './rpc'
import type { ChainflipAsset, ChainflipFreeBalancesResponse } from './types'

const SS58_PREFIX_BYTES = new TextEncoder().encode('SS58PRE')

vi.mock('./rpc', () => ({
  cfFreeBalances: vi.fn(),
  cfAccountInfoV2: vi.fn(),
}))

const decodeSs58 = (
  address: string,
): { prefix: number; payload: Uint8Array; checksum: Uint8Array } => {
  const bytes = bs58.decode(address)
  const first = bytes[0]
  const isTwoBytePrefix = (first & 0b0100_0000) === 0b0100_0000
  const prefixLength = isTwoBytePrefix ? 2 : 1
  const prefix = isTwoBytePrefix ? (first & 0b0011_1111) | (bytes[1] << 6) : first

  const payload = bytes.slice(prefixLength, prefixLength + 32)
  const checksum = bytes.slice(prefixLength + 32)

  return { prefix, payload, checksum }
}

const computeChecksum = (prefixBytes: Uint8Array, payload: Uint8Array): Uint8Array => {
  const data = new Uint8Array(prefixBytes.length + payload.length)
  data.set(prefixBytes)
  data.set(payload, prefixBytes.length)

  const checksumInput = new Uint8Array(SS58_PREFIX_BYTES.length + data.length)
  checksumInput.set(SS58_PREFIX_BYTES)
  checksumInput.set(data, SS58_PREFIX_BYTES.length)

  return blake2b(checksumInput, undefined, 64).slice(0, 2)
}

describe('chainflip account helpers', () => {
  it('encodes ETH addresses into SS58 with prefix 2112', () => {
    const ethAddress = '0x0000000000000000000000000000000000000001'
    const ss58Address = ethAddressToScAccount(ethAddress)

    const { prefix, payload, checksum } = decodeSs58(ss58Address)
    const expectedPayload = new Uint8Array(32)
    expectedPayload.set(new Uint8Array(20).fill(0), 0)
    expectedPayload.set(Uint8Array.from([1]), 31)

    const expectedPrefixBytes = new Uint8Array(2)
    expectedPrefixBytes.set(Uint8Array.from([(CHAINFLIP_SS58_PREFIX & 0b0011_1111) | 0b0100_0000]))
    expectedPrefixBytes.set(Uint8Array.from([CHAINFLIP_SS58_PREFIX >> 6]), 1)

    const expectedChecksum = computeChecksum(expectedPrefixBytes, expectedPayload)

    expect(prefix).toBe(CHAINFLIP_SS58_PREFIX)
    expect(payload).toEqual(expectedPayload)
    expect(checksum).toEqual(expectedChecksum)
  })

  it('throws on invalid ETH addresses', () => {
    expect(() => ethAddressToScAccount('0x123')).toThrow()
  })

  it('detects funded accounts', () => {
    const asset: ChainflipAsset = { chain: 'Ethereum', asset: 'USDC' }

    expect(isAccountFunded([{ asset, balance: '0' }])).toBe(false)
    expect(isAccountFunded([{ asset, balance: '1' }])).toBe(true)
  })

  it('returns account status with balances and funding state', async () => {
    const scAccountId = ethAddressToScAccount('0x0000000000000000000000000000000000000001')
    const freeBalancesResult: ChainflipFreeBalancesResponse = [
      { asset: { chain: 'Ethereum', asset: 'USDC' }, balance: '1' },
    ]
    const accountInfoResult = { account_id: scAccountId }

    vi.mocked(cfFreeBalances).mockResolvedValue(freeBalancesResult)
    vi.mocked(cfAccountInfoV2).mockResolvedValue(accountInfoResult)

    const status = await getChainflipAccountStatus('0x0000000000000000000000000000000000000001')

    expect(status).toEqual({
      scAccountId,
      freeBalances: freeBalancesResult,
      accountInfo: accountInfoResult,
      isFunded: true,
    })
  })
})

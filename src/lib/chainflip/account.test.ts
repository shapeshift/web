import { describe, expect, it, vi } from 'vitest'

import { ethAddressToScAccount, getChainflipAccountStatus, isAccountFunded } from './account'
import { cfAccountInfoV2, cfFreeBalances } from './rpc'
import type { ChainflipAsset, ChainflipFreeBalancesResponse } from './types'

vi.mock('./rpc', () => ({
  cfFreeBalances: vi.fn(),
  cfAccountInfoV2: vi.fn(),
}))

describe('ethAddressToScAccount', () => {
  it('derives a deterministic SS58 account from an ETH address with cF prefix', () => {
    const result1 = ethAddressToScAccount('0x36eaD71325604DC15d35FAE584D7b50646D81753')
    const result2 = ethAddressToScAccount('0x36eaD71325604DC15d35FAE584D7b50646D81753')
    expect(result1).toBe(result2)
    expect(typeof result1).toBe('string')
    expect(result1.length).toBeGreaterThan(30)
    expect(result1.startsWith('cF')).toBe(true)
  })

  it('produces different accounts for different addresses', () => {
    const a = ethAddressToScAccount('0x36eaD71325604DC15d35FAE584D7b50646D81753')
    const b = ethAddressToScAccount('0x0000000000000000000000000000000000000001')
    expect(a).not.toBe(b)
  })

  it('throws on invalid input', () => {
    expect(() => ethAddressToScAccount('not-hex')).toThrow()
    expect(() => ethAddressToScAccount('0x1234')).toThrow()
  })
})

describe('isAccountFunded', () => {
  it('returns false for empty balances', () => {
    expect(isAccountFunded([])).toBe(false)
  })

  it('returns false for all zero balances', () => {
    const asset: ChainflipAsset = { chain: 'Ethereum', asset: 'USDC' }
    expect(isAccountFunded([{ asset, balance: '0' }])).toBe(false)
  })

  it('returns true when any balance is positive', () => {
    const asset: ChainflipAsset = { chain: 'Ethereum', asset: 'USDC' }
    expect(isAccountFunded([{ asset, balance: '1' }])).toBe(true)
  })
})

describe('getChainflipAccountStatus', () => {
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

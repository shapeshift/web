import { skipToken } from '@tanstack/react-query'
import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { getAffiliateRevenueUsdQueryFn } from './useAffiliateRevenueUsdQuery'

vi.mock('axios')
vi.mock('@/config', () => ({
  getConfig: () => ({ VITE_AFFILIATE_REVENUE_URL: 'https://revenue.example' }),
}))

const fetchRevenue = () => {
  const queryFn = getAffiliateRevenueUsdQueryFn({
    startTimestamp: Date.UTC(2026, 9, 1),
    endTimestamp: Date.UTC(2026, 9, 31, 23, 59, 59),
  })
  if (queryFn === skipToken) throw new Error('Expected a revenue query')
  return queryFn()
}

describe('affiliate revenue', () => {
  it('accepts zero revenue and bounds the monthly request', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { totalUsd: 0 } })
    await expect(fetchRevenue()).resolves.toBe(0)
    expect(axios.get).toHaveBeenCalledWith(
      'https://revenue.example/api/v1/affiliate/revenue?startDate=2026-10-01&endDate=2026-10-31',
      { timeout: 30_000 },
    )
  })

  it.each([undefined, null, '100', NaN, Infinity])('rejects invalid total %s', async totalUsd => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { totalUsd } })
    await expect(fetchRevenue()).rejects.toThrow('Invalid affiliate revenue response')
  })

  it('propagates a timeout instead of returning zero', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('timeout'))
    await expect(fetchRevenue()).rejects.toThrow('timeout')
  })

  it('rejects incomplete totals rather than understating rewards', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { totalUsd: 100, failedProviders: ['mayachain'] },
    })
    await expect(fetchRevenue()).rejects.toThrow('Affiliate revenue is incomplete')
  })

  it('waits for epoch metadata', () => {
    expect(getAffiliateRevenueUsdQueryFn({})).toBe(skipToken)
  })
})

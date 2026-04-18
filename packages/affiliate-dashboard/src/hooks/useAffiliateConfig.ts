import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { parseResponse } from '../lib/api'
import { AFFILIATE_URL } from '../lib/constants'

const AffiliateConfigSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  receiveAddress: z.string().nullable(),
  partnerCode: z.string().nullable(),
  bps: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type AffiliateConfig = z.infer<typeof AffiliateConfigSchema>

export const affiliateConfigQueryKey = (address: string): readonly unknown[] => [
  'affiliate',
  'config',
  address,
]

const fetchConfig = async (address: string): Promise<AffiliateConfig | undefined> => {
  const response = await fetch(`${AFFILIATE_URL}/${encodeURIComponent(address)}`)

  if (response.status === 404) return undefined

  return parseResponse(response, AffiliateConfigSchema)
}

export const useAffiliateConfig = (
  address: string,
): UseQueryResult<AffiliateConfig | undefined, Error> =>
  useQuery({
    queryKey: affiliateConfigQueryKey(address),
    queryFn: () => fetchConfig(address),
    enabled: Boolean(address),
  })

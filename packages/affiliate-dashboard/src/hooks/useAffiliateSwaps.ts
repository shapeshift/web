import type { UseQueryResult } from '@tanstack/react-query'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { parseResponse } from '../lib/api'
import { SWAPS_PER_PAGE } from '../lib/constants'
import type { Period } from '../lib/periods'

const AFFILIATE_SWAPS_URL = `${import.meta.env.VITE_API_URL}/v1/affiliate/swaps`

const AssetSchema = z.union([
  z.string(),
  z
    .object({
      symbol: z.string().optional(),
      name: z.string().optional(),
    })
    .passthrough(),
])

const AffiliateSwapSchema = z
  .object({
    id: z.string(),
    createdAt: z.string(),
    status: z.string(),
    sellAsset: AssetSchema,
    buyAsset: AssetSchema,
    sellAmountUsd: z.string().nullable(),
    affiliateFeeUsd: z.string().nullable(),
    affiliateBps: z.string().nullable(),
  })
  .passthrough()

const ApiResponseSchema = z
  .object({
    swaps: z.array(AffiliateSwapSchema),
    total: z.number(),
  })
  .passthrough()

type AffiliateSwap = z.infer<typeof AffiliateSwapSchema>

interface AffiliateSwapsPage {
  swaps: AffiliateSwap[]
  total: number
}

const fetchSwaps = async (
  address: string,
  period: Period,
  page: number,
): Promise<AffiliateSwapsPage> => {
  const params = new URLSearchParams({
    address,
    limit: String(SWAPS_PER_PAGE),
    offset: String(page * SWAPS_PER_PAGE),
  })

  if (period.startDate) params.append('startDate', period.startDate)
  if (period.endDate) params.append('endDate', period.endDate)

  const response = await fetch(`${AFFILIATE_SWAPS_URL}?${params.toString()}`)
  const data = await parseResponse(response, ApiResponseSchema)

  return { swaps: data.swaps, total: data.total }
}

export const useAffiliateSwaps = (
  address: string,
  period: Period,
  page: number,
): UseQueryResult<AffiliateSwapsPage, Error> =>
  useQuery({
    queryKey: ['affiliate', 'swaps', address, period.startDate, period.endDate, page],
    queryFn: () => fetchSwaps(address, period, page),
    enabled: Boolean(address),
    placeholderData: keepPreviousData,
  })

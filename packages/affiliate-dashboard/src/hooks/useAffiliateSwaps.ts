import type { UseQueryResult } from '@tanstack/react-query'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { NullableNumericString, parseResponse } from '../lib/api'
import { AFFILIATE_URL, SWAPS_PER_PAGE } from '../lib/constants'
import type { Period } from '../lib/periods'

const AFFILIATE_SWAPS_URL = `${AFFILIATE_URL}/swaps`

const AssetSchema = z
  .object({
    symbol: z.string(),
  })
  .passthrough()

const AffiliateSwapSchema = z
  .object({
    id: z.string(),
    createdAt: z.string(),
    status: z.string(),
    sellAsset: AssetSchema,
    buyAsset: AssetSchema,
    sellAmountUsd: NullableNumericString,
    affiliateFeeUsd: NullableNumericString,
    affiliateBps: z.string().nullable(),
  })
  .passthrough()

const ApiResponseSchema = z
  .object({
    swaps: z.array(AffiliateSwapSchema),
    total: z.number(),
  })
  .passthrough()

export type AffiliateSwap = z.infer<typeof AffiliateSwapSchema>

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

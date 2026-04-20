import type { Asset } from '@shapeshiftoss/types'
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { parseResponse } from '../lib/api'
import { SWAPS_PER_PAGE } from '../lib/constants'
import type { Period } from '../lib/periods'

const AFFILIATE_SWAPS_URL = `${import.meta.env.VITE_API_URL}/v1/affiliate/swaps`

// Loose runtime shape — relies on the API returning a valid Asset object.
// Typed as Asset at the TS boundary for downstream consumers. explorerTxLink
// is validated explicitly because TxLinks builds href URLs from it.
const AssetSchema = z
  .object({
    symbol: z.string(),
    name: z.string(),
    explorerTxLink: z.string(),
  })
  .passthrough()
  .transform(v => v as unknown as Asset)

const AffiliateSwapSchema = z
  .object({
    swapId: z.string(),
    createdAt: z.string(),
    status: z.string(),
    sellAsset: AssetSchema,
    buyAsset: AssetSchema,
    sellAmountCryptoPrecision: z.string(),
    expectedBuyAmountCryptoPrecision: z.string(),
    actualBuyAmountCryptoPrecision: z.string().nullable(),
    sellAmountUsd: z.string().nullable(),
    affiliateBps: z.number().nullable(),
    shapeshiftBps: z.number(),
    affiliateFeeUsd: z.string().nullable(),
    swapperName: z.string(),
    sellTxHash: z.string().nullable(),
    buyTxHash: z.string().nullable(),
    isAffiliateVerified: z.boolean().nullable(),
  })
  .passthrough()

const ApiResponseSchema = z
  .object({
    swaps: z.array(AffiliateSwapSchema),
    nextCursor: z.string().nullable(),
  })
  .passthrough()

export type AffiliateSwap = z.infer<typeof AffiliateSwapSchema>

export interface AffiliateSwapsPage {
  swaps: AffiliateSwap[]
  nextCursor: string | null
}

const fetchSwaps = async (
  address: string,
  period: Period,
  cursor: string | undefined,
): Promise<AffiliateSwapsPage> => {
  const params = new URLSearchParams({
    address,
    limit: String(SWAPS_PER_PAGE),
  })

  if (period.startDate) params.append('startDate', period.startDate)
  if (period.endDate) params.append('endDate', period.endDate)
  if (cursor) params.append('cursor', cursor)

  const response = await fetch(`${AFFILIATE_SWAPS_URL}?${params.toString()}`)
  return parseResponse(response, ApiResponseSchema)
}

export const useAffiliateSwaps = (
  address: string,
  period: Period,
): UseInfiniteQueryResult<InfiniteData<AffiliateSwapsPage, string | undefined>, Error> =>
  useInfiniteQuery({
    queryKey: ['affiliate', 'swaps', address, period.startDate, period.endDate],
    queryFn: ({ pageParam }) => fetchSwaps(address, period, pageParam),
    enabled: Boolean(address),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })

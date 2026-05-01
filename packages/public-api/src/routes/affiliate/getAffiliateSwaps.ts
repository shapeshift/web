import { BigAmount } from '@shapeshiftoss/utils'
import type { Request, Response } from 'express'

import { getAsset } from '../../assets'
import { env } from '../../env'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { rateLimitResponse } from '../../types'
import { calculateAffiliateFeeAmountUsd } from './calculateAffiliateFeeAmountUsd'
import type { AffiliateSwapsResponse } from './types'
import {
  AffiliateSwapsRequestSchema,
  AffiliateSwapsResponseSchema,
  SwapServiceAffiliateSwapsResponseSchema,
} from './types'

registry.registerPath({
  method: 'get',
  path: '/v1/affiliate/swaps',
  operationId: 'getAffiliateSwaps',
  summary: 'Get affiliate swaps',
  description:
    'Retrieve paginated swap history for an affiliate address. Supports optional date range filtering.',
  tags: ['Affiliate'],
  request: {
    query: AffiliateSwapsRequestSchema,
  },
  responses: {
    200: {
      description: 'Affiliate swaps',
      content: { 'application/json': { schema: AffiliateSwapsResponseSchema } },
    },
    400: { description: 'Invalid query parameters' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const getAffiliateSwaps = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryResult = AffiliateSwapsRequestSchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        code: 'INVALID_REQUEST',
        details: queryResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const { address, startDate, endDate, limit, cursor } = queryResult.data

    const url = new URL(`${env.SWAP_SERVICE_BASE_URL}/v1/affiliate/swaps`)

    url.searchParams.append('address', address)
    url.searchParams.append('limit', String(limit))

    if (cursor) url.searchParams.append('cursor', cursor)
    if (startDate) url.searchParams.append('startDate', startDate)
    if (endDate) url.searchParams.append('endDate', endDate)

    const response = await fetchSwapService(res, url.toString())
    if (!response) return

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upstream error' }))
      res.status(response.status).json(body)
      return
    }

    const upstreamResult = SwapServiceAffiliateSwapsResponseSchema.safeParse(
      await response.json().catch(() => null),
    )

    if (!upstreamResult.success) {
      console.error(
        'Unexpected response shape from swap-service /v1/affiliate/swaps:',
        upstreamResult.error.errors,
      )
      res.status(503).json({
        error: 'Invalid response from swap service',
        code: 'INVALID_RESPONSE',
      } satisfies ErrorResponse)
      return
    }

    const payload: AffiliateSwapsResponse = {
      swaps: upstreamResult.data.swaps.map(swap => {
        const sellAmount = BigAmount.fromBaseUnit({
          value:
            swap.affiliateVerificationDetails?.verifiedSellAmountCryptoBaseUnit ||
            swap.sellAmountCryptoBaseUnit,
          precision: swap.sellAsset.precision,
        }).toBN()

        const buyAmount = BigAmount.fromBaseUnit({
          value: swap.actualBuyAmountCryptoBaseUnit || swap.expectedBuyAmountCryptoBaseUnit,
          precision: swap.buyAsset.precision,
        }).toBN()

        const affiliateBps =
          swap.affiliateVerificationDetails?.affiliateBps ?? swap.affiliateBps ?? 0

        const partnerBps = Math.max(0, affiliateBps - swap.shapeshiftBps)

        const affiliateFeeAmountUsd = calculateAffiliateFeeAmountUsd(
          partnerBps,
          swap,
          getAsset(swap.affiliateFeeAssetId ?? ''),
        )

        return {
          swapId: swap.swapId,
          status: swap.status,
          sellAsset: swap.sellAsset,
          buyAsset: swap.buyAsset,
          sellAmountCryptoPrecision: sellAmount.toPrecision(),
          sellAmountUsd: swap.sellAssetUsd ? sellAmount.times(swap.sellAssetUsd).toString() : null,
          buyAmountCryptoPrecision: buyAmount.toPrecision(),
          buyAmountUsd: swap.buyAssetUsd ? buyAmount.times(swap.buyAssetUsd).toString() : null,
          affiliateFeeAmountUsd,
          affiliateBps,
          partnerBps,
          shapeshiftBps: swap.shapeshiftBps,
          swapperName: swap.swapperName,
          sellTxHash: swap.sellTxHash,
          buyTxHash: swap.buyTxHash,
          isAffiliateVerified: swap.isAffiliateVerified,
          createdAt: swap.createdAt,
        }
      }),
      nextCursor: upstreamResult.data.nextCursor,
    }

    const responseResult = AffiliateSwapsResponseSchema.safeParse(payload)
    if (!responseResult.success) {
      console.error('Failed to shape affiliate swaps response:', responseResult.error.errors)
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } satisfies ErrorResponse)
      return
    }

    res.status(200).json(responseResult.data)
  } catch (error) {
    console.error('Unexpected error in getAffiliateSwaps:', error)
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' } satisfies ErrorResponse)
  }
}

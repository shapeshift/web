import type { GetTradeRateInput } from '@shapeshiftoss/swapper'
import { getTradeRates, SwapperName, swappers, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'

import { getAsset } from '../../assets'
import { registry } from '../../registry'
import { getSwapperDeps } from '../../swapperDeps'
import type { ErrorResponse } from '../../types'
import { PartnerCodeHeaderSchema, rateLimitResponse } from '../../types'
import type { ApiRate, RateResponse } from './types'
import { RateResponseSchema, RatesRequestSchema } from './types'

const ENABLED_SWAPPER_NAMES = [
  'THORChain',
  'MAYAChain',
  '0x',
  'CoW Swap',
  'Portals',
  'Chainflip',
  'Jupiter',
  'Relay',
  'ButterSwap',
  'Bebop',
] as const

// Rate timeout per swapper (10 seconds)
const RATE_TIMEOUT_MS = 10_000

registry.registerPath({
  method: 'get',
  path: '/v1/swap/rates',
  operationId: 'getSwapRates',
  summary: 'Get swap rates',
  description:
    'Get informative swap rates from all available swappers. This does not create a transaction.',
  tags: ['Swaps'],
  request: {
    headers: PartnerCodeHeaderSchema,
    query: RatesRequestSchema,
  },
  responses: {
    200: {
      description: 'Swap rates',
      content: { 'application/json': { schema: RateResponseSchema } },
    },
    400: {
      description: 'Invalid request',
    },
    429: rateLimitResponse,
  },
})

export const getRates = async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse and validate request
    const parseResult = RatesRequestSchema.safeParse(req.query)
    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request parameters',
        details: parseResult.error.errors,
      }
      res.status(400).json(errorResponse)
      return
    }

    const {
      sellAssetId,
      buyAssetId,
      sellAmountCryptoBaseUnit,
      slippageTolerancePercentageDecimal,
      allowMultiHop,
    } = parseResult.data

    // Get assets
    const sellAsset = getAsset(sellAssetId)
    const buyAsset = getAsset(buyAssetId)

    if (!sellAsset) {
      res.status(400).json({ error: `Unknown sell asset: ${sellAssetId}` } as ErrorResponse)
      return
    }
    if (!buyAsset) {
      res.status(400).json({ error: `Unknown buy asset: ${buyAssetId}` } as ErrorResponse)
      return
    }

    // Create swapper dependencies
    const deps = getSwapperDeps()

    // Build rate input
    const rateInput = {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      affiliateBps: req.affiliateInfo?.affiliateBps!,
      allowMultiHop,
      slippageTolerancePercentageDecimal,
      receiveAddress: undefined,
      sendAddress: undefined,
      accountNumber: undefined,
      quoteOrRate: 'rate' as const,
      chainId: sellAsset.chainId,
    }

    // Map string names to SwapperName enum
    const enabledSwappers = ENABLED_SWAPPER_NAMES.map(name => {
      const swapperName = Object.values(SwapperName).find(v => v === name)
      return swapperName
    }).filter((name): name is (typeof SwapperName)[keyof typeof SwapperName] => name !== undefined)

    // Fetch rates from all enabled swappers in parallel
    const ratePromises = enabledSwappers.map(async (swapperName): Promise<ApiRate | null> => {
      try {
        const swapper = swappers[swapperName]
        if (!swapper) return null

        const result = await getTradeRates(
          rateInput as GetTradeRateInput,
          swapperName,
          deps,
          RATE_TIMEOUT_MS,
        )

        if (!result) return null

        if (result.isErr()) {
          const error = result.unwrapErr()
          return {
            swapperName,
            rate: '0',
            buyAmountCryptoBaseUnit: '0',
            sellAmountCryptoBaseUnit,
            steps: 0,
            estimatedExecutionTimeMs: undefined,
            priceImpactPercentageDecimal: undefined,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            affiliateBps: req.affiliateInfo?.affiliateBps!,
            networkFeeCryptoBaseUnit: undefined,
            error: {
              code: error.code ?? TradeQuoteError.UnknownError,
              message: error.message,
            },
          }
        }

        const rates = result.unwrap()
        if (rates.length === 0) return null

        // Return the first/best rate
        const rate = rates[0]
        const firstStep = rate.steps[0]

        return {
          swapperName,
          rate: rate.rate,
          buyAmountCryptoBaseUnit: firstStep.buyAmountAfterFeesCryptoBaseUnit,
          sellAmountCryptoBaseUnit: firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          steps: rate.steps.length,
          estimatedExecutionTimeMs: firstStep.estimatedExecutionTimeMs,
          priceImpactPercentageDecimal: rate.priceImpactPercentageDecimal,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          affiliateBps: req.affiliateInfo?.affiliateBps!,
          networkFeeCryptoBaseUnit: firstStep.feeData.networkFeeCryptoBaseUnit,
        }
      } catch (error) {
        console.error(`Error fetching rate from ${swapperName}:`, error)
        return null
      }
    })

    const results = await Promise.allSettled(ratePromises)
    const rates: ApiRate[] = results
      .filter((r): r is PromiseFulfilledResult<ApiRate | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((r): r is ApiRate => r !== null)

    // Sort by best rate (highest buy amount)
    rates.sort((a, b) => {
      if (a.error && !b.error) return 1
      if (!a.error && b.error) return -1
      try {
        const aBuyAmount = BigInt(a.buyAmountCryptoBaseUnit.split('.')[0] ?? '0')
        const bBuyAmount = BigInt(b.buyAmountCryptoBaseUnit.split('.')[0] ?? '0')
        return bBuyAmount > aBuyAmount ? 1 : bBuyAmount < aBuyAmount ? -1 : 0
      } catch {
        return 0
      }
    })

    const now = Date.now()
    const response: RateResponse = {
      rates,
      timestamp: now,
      expiresAt: now + 30_000, // 30 second expiry
      affiliateAddress: req.affiliateInfo?.affiliateAddress,
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getRates:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}

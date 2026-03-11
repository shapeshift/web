import type { GetTradeRateInput } from '@shapeshiftoss/swapper'
import { TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { getAsset, getAssetsById } from '../assets'
import { DEFAULT_AFFILIATE_BPS } from '../config'
import { booleanFromString } from '../lib/zod'
import { createServerSwapperDeps } from '../swapperDeps'
import type { ApiRate, ErrorResponse, RatesResponse } from '../types'

// Request validation schema
export const RatesRequestSchema = z.object({
  sellAssetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
  buyAssetId: z.string().min(1).openapi({
    example: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  }),
  sellAmountCryptoBaseUnit: z
    .string()
    .regex(/^\d+$/, 'sellAmountCryptoBaseUnit must be a positive integer')
    .openapi({ example: '1000000000000000000' }),
  slippageTolerancePercentageDecimal: z
    .string()
    .regex(
      /^(?:\d+)(?:\.\d+)?$/,
      'slippageTolerancePercentageDecimal must be a non-negative decimal number',
    )
    .optional()
    .openapi({ example: '0.01' }),
  allowMultiHop: booleanFromString.optional().default(true).openapi({ example: true }),
})

// Swapper names as strings to avoid import issues
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

// Lazy load swapper to avoid import issues at module load time
let swapperModule: Awaited<ReturnType<typeof importSwapperModule>> | null = null
const importSwapperModule = () => import('@shapeshiftoss/swapper')
const getSwapperModule = async () => {
  if (!swapperModule) {
    swapperModule = await importSwapperModule()
  }
  return swapperModule
}

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

    // Lazy load swapper module
    let swapperModuleResult
    try {
      swapperModuleResult = await getSwapperModule()
    } catch (error) {
      console.error('Failed to load swapper module:', error)
      res.status(503).json({
        error: 'Swap service temporarily unavailable',
        details: 'Failed to initialize swapper module',
      } as ErrorResponse)
      return
    }
    const { getTradeRates, swappers, SwapperName } = swapperModuleResult

    // Create swapper dependencies
    const deps = createServerSwapperDeps(getAssetsById())

    // Build rate input
    const rateInput = {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      affiliateBps: req.affiliateInfo?.affiliateBps ?? DEFAULT_AFFILIATE_BPS,
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
            affiliateBps: req.affiliateInfo?.affiliateBps ?? DEFAULT_AFFILIATE_BPS,
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
          affiliateBps: req.affiliateInfo?.affiliateBps ?? DEFAULT_AFFILIATE_BPS,
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
    const response: RatesResponse = {
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

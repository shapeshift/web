import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetExactOutputTradeRateInput, GetTradeRateInput } from '@shapeshiftoss/swapper'
import { getTradeRates, swappers, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'

import { getAsset } from '../../assets'
import { ENABLED_SWAPPER_NAMES } from '../../constants'
import { env } from '../../env'
import { isDepositAddressSwapper } from '../../lib/depositAddress'
import { registry } from '../../registry'
import { getSwapperDeps } from '../../swapperDeps'
import type { ErrorResponse } from '../../types'
import { PartnerCodeHeaderSchema, rateLimitResponse } from '../../types'
import type { ApiRate, RateResponse } from './types'
import { RateResponseSchema, RatesRequestSchema } from './types'

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
    500: { description: 'Internal server error' },
  },
})

export const getRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryResult = RatesRequestSchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: queryResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const {
      sellAssetId,
      buyAssetId,
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      slippageTolerancePercentageDecimal,
    } = queryResult.data

    const sellAsset = getAsset(sellAssetId)
    if (!sellAsset) {
      res.status(400).json({ error: `Unknown sell asset: ${sellAssetId}` } satisfies ErrorResponse)
      return
    }

    const buyAsset = getAsset(buyAssetId)
    if (!buyAsset) {
      res.status(400).json({ error: `Unknown buy asset: ${buyAssetId}` } satisfies ErrorResponse)
      return
    }

    const deps = getSwapperDeps()

    const rateInput = {
      sellAsset,
      buyAsset,
      ...(buyAmountCryptoBaseUnit
        ? { buyAmountCryptoBaseUnit }
        : { sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit }),
      affiliateBps: req.affiliateInfo?.affiliateBps ?? env.DEFAULT_AFFILIATE_BPS,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal,
      receiveAddress: undefined,
      sendAddress: undefined,
      accountNumber: undefined,
      quoteOrRate: 'rate' as const,
      chainId: sellAsset.chainId,
      ...(isEvmChainId(sellAsset.chainId) && { supportsEIP1559: false as const }),
    }

    const ratePromises = ENABLED_SWAPPER_NAMES.map(async (swapperName): Promise<ApiRate | null> => {
      try {
        const swapper = swappers[swapperName]
        if (!swapper) return null

        const result = await getTradeRates(
          rateInput as GetTradeRateInput | GetExactOutputTradeRateInput,
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
            sellAmountCryptoBaseUnit: sellAmountCryptoBaseUnit ?? '0',
            steps: 0,
            allowanceContract: undefined,
            estimatedExecutionTimeMs: undefined,
            supportsDepositAddress: isDepositAddressSwapper(swapperName),
            priceImpactPercentageDecimal: undefined,
            partnerBps: req.affiliateInfo?.partnerBps,
            shapeshiftBps: req.affiliateInfo?.shapeshiftBps ?? env.DEFAULT_AFFILIATE_BPS,
            affiliateBps: req.affiliateInfo?.affiliateBps ?? env.DEFAULT_AFFILIATE_BPS,
            networkFeeCryptoBaseUnit: undefined,
            error: {
              code: error.code ?? TradeQuoteError.UnknownError,
              message: error.message,
            },
          }
        }

        const rates = result.unwrap()
        if (rates.length === 0) return null

        const rate = rates[0]
        const step = rate.steps[0]
        const lastStep = rate.steps[rate.steps.length - 1]

        return {
          swapperName,
          rate: rate.rate,
          buyAmountCryptoBaseUnit: lastStep.buyAmountAfterFeesCryptoBaseUnit,
          sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          steps: rate.steps.length,
          allowanceContract: step.allowanceContract,
          estimatedExecutionTimeMs: step.estimatedExecutionTimeMs,
          supportsDepositAddress: isDepositAddressSwapper(swapperName),
          priceImpactPercentageDecimal: rate.priceImpactPercentageDecimal,
          partnerBps: req.affiliateInfo?.partnerBps,
          shapeshiftBps: req.affiliateInfo?.shapeshiftBps ?? env.DEFAULT_AFFILIATE_BPS,
          affiliateBps: rate.affiliateBps,
          networkFeeCryptoBaseUnit: step.feeData.networkFeeCryptoBaseUnit,
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
      expiresAt: now + 30_000,
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getRates:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}

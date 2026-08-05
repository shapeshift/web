import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import {
  buildSwapMetadata,
  getDefaultSlippageDecimalPercentageForSwapper,
  getTradeQuotes,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

import { getAsset } from '../../assets'
import { ENABLED_SWAPPER_NAMES, MAX_QUOTE_DEADLINE_MS } from '../../constants'
import { env } from '../../env'
import { QuoteStore, quoteStore } from '../../lib/quoteStore'
import { registry } from '../../registry'
import { getSwapperDeps } from '../../swapperDeps'
import type { ErrorResponse } from '../../types'
import { PartnerCodeHeaderSchema, rateLimitResponse } from '../../types'
import type { QuoteResponse } from './types'
import { QuoteRequestSchema, QuoteResponseSchema } from './types'
import { buildApprovalInfo, transformQuoteStep } from './utils'

registry.registerPath({
  method: 'post',
  path: '/v1/swap/quote',
  operationId: 'getSwapQuote',
  summary: 'Get executable quote',
  description:
    'Get an executable quote for a swap, including transaction data. Requires a specific swapper name.',
  tags: ['Swaps'],
  request: {
    headers: PartnerCodeHeaderSchema,
    body: {
      content: { 'application/json': { schema: QuoteRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'Swap quote',
      content: { 'application/json': { schema: QuoteResponseSchema } },
    },
    400: {
      description: 'Invalid request or unavailable swapper',
    },
    404: { description: 'No quote available' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
  },
})

export const getQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const bodyResult = QuoteRequestSchema.safeParse(req.body)
    if (!bodyResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: bodyResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const {
      sellAssetId,
      buyAssetId,
      sellAmountCryptoBaseUnit,
      receiveAddress,
      sendAddress,
      swapperName,
      slippageTolerancePercentageDecimal,
      accountNumber,
      xpub,
    } = bodyResult.data

    const validSwapperName = Object.values(SwapperName).find(v => v === swapperName)
    if (!validSwapperName) {
      res.status(400).json({ error: `Unknown swapper: ${swapperName}` } satisfies ErrorResponse)
      return
    }

    const swapper = swappers[validSwapperName]
    if (!swapper || !ENABLED_SWAPPER_NAMES.includes(validSwapperName)) {
      res.status(400).json({
        error: `Swapper not available: ${swapperName}`,
      } satisfies ErrorResponse)
      return
    }

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

    if (
      fromChainId(sellAsset.chainId).chainNamespace === CHAIN_NAMESPACE.Evm &&
      !viemClientByChainId[sellAsset.chainId]
    ) {
      res.status(400).json({
        error: `Unsupported EVM chain: ${sellAsset.chainId}`,
        code: 'UNSUPPORTED_CHAIN',
      } satisfies ErrorResponse)
      return
    }

    const deps = getSwapperDeps()

    const slippage = (() => {
      if (slippageTolerancePercentageDecimal) return slippageTolerancePercentageDecimal

      try {
        return getDefaultSlippageDecimalPercentageForSwapper(validSwapperName)
      } catch {
        return '0.01' // 1% default fallback
      }
    })()

    const quoteInput = {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      affiliateBps: req.affiliateInfo?.affiliateBps ?? env.DEFAULT_AFFILIATE_BPS,
      allowMultiHop: false,
      slippageTolerancePercentageDecimal: slippage,
      receiveAddress,
      sendAddress,
      accountNumber,
      xpub,
      quoteOrRate: 'quote' as const,
      chainId: sellAsset.chainId,
      // Consumers sign themselves - price with legacy gas semantics
      supportsEIP1559: false,
    }

    // utxo accountType/xpub are not first class public api inputs yet, the cast covers that gap
    const result = await getTradeQuotes(quoteInput as GetTradeQuoteInput, validSwapperName, deps)

    if (!result) {
      res.status(404).json({
        error: 'No quote available from this swapper',
      } satisfies ErrorResponse)
      return
    }

    if (result.isErr()) {
      const error = result.unwrapErr()
      res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
      } satisfies ErrorResponse)
      return
    }

    const quotes = result.unwrap()
    if (quotes.length === 0) {
      res.status(404).json({ error: 'No quote available' } satisfies ErrorResponse)
      return
    }

    const quote = quotes[0]
    const step = quote.steps[0]
    const lastStep = quote.steps[quote.steps.length - 1]

    const quoteId = uuidv4()
    const now = Date.now()

    const baseQuote = {
      quoteId,
      swapperName: validSwapperName,
      sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: lastStep.buyAmountAfterFeesCryptoBaseUnit,
      partnerBps: req.affiliateInfo?.partnerBps,
      shapeshiftBps: req.affiliateInfo?.shapeshiftBps ?? env.DEFAULT_AFFILIATE_BPS,
      affiliateBps: quote.affiliateBps,
      rate: quote.rate,
    }

    if (!Number.isFinite(quote.deadline) || quote.deadline <= now) {
      res.status(502).json({
        error: 'Swapper quote expired before it could be returned; request a new quote',
      } satisfies ErrorResponse)
      return
    }

    if (quote.deadline > now + MAX_QUOTE_DEADLINE_MS) {
      console.error(
        `[getQuote] ${validSwapperName} deadline ${quote.deadline} exceeds MAX_QUOTE_DEADLINE_MS sanity ceiling - provider bug, or raise the ceiling if this swapper legitimately quotes longer`,
      )
      res.status(502).json({
        error: `Swapper quote deadline exceeds the MAX_QUOTE_DEADLINE_MS sanity ceiling`,
      } satisfies ErrorResponse)
      return
    }

    quoteStore.set(quoteId, {
      ...baseQuote,
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      receiveAddress,
      sendAddress,
      partnerAddress: req.affiliateInfo?.partnerAddress,
      partnerCode: req.affiliateInfo?.partnerCode,
      createdAt: now,
      expiresAt: quote.deadline + QuoteStore.BIND_GRACE_MS,
      metadata: buildSwapMetadata(step, { stepIndex: 0, quoteId }),
      status: 'pending',
    })

    const response: QuoteResponse = {
      ...baseQuote,
      sellAsset,
      buyAsset,
      buyAmountBeforeFeesCryptoBaseUnit: lastStep.buyAmountBeforeFeesCryptoBaseUnit,
      slippageTolerancePercentageDecimal: quote.slippageTolerancePercentageDecimal,
      networkFeeCryptoBaseUnit: step.feeData.networkFeeCryptoBaseUnit,
      steps: quote.steps.map(transformQuoteStep),
      approval: await buildApprovalInfo(step, sendAddress),
      expiresAt: quote.deadline,
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getQuote:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}

import type { GetTradeQuoteInputWithWallet, TradeQuote } from '@shapeshiftoss/swapper'
import {
  getDefaultSlippageDecimalPercentageForSwapper,
  getTradeQuotes,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

import { getAsset } from '../../assets'
import { QuoteStore, quoteStore } from '../../lib/quoteStore'
import { registry } from '../../registry'
import { getSwapperDeps } from '../../swapperDeps'
import type { ErrorResponse } from '../../types'
import { PartnerCodeHeaderSchema, rateLimitResponse } from '../../types'
import type { QuoteResponse } from './types'
import { QuoteRequestSchema, QuoteResponseSchema } from './types'
import { buildApprovalInfo, resolveDepositContext, transformQuoteStep } from './utils'

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
    429: rateLimitResponse,
  },
})

export const getQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse and validate request
    const parseResult = QuoteRequestSchema.safeParse(req.body)
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
      receiveAddress,
      sendAddress,
      swapperName,
      slippageTolerancePercentageDecimal,
      allowMultiHop,
      accountNumber,
    } = parseResult.data

    // Validate swapper name
    const validSwapperName = Object.values(SwapperName).find(v => v === swapperName) as
      | SwapperName
      | undefined
    if (!validSwapperName) {
      res.status(400).json({ error: `Unknown swapper: ${swapperName}` } as ErrorResponse)
      return
    }

    // Validate swapper exists
    const swapper = swappers[validSwapperName]
    if (!swapper) {
      res.status(400).json({
        error: `Swapper not available: ${swapperName}`,
      } as ErrorResponse)
      return
    }

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

    // Get default slippage if not provided
    let slippage = slippageTolerancePercentageDecimal
    if (!slippage) {
      try {
        slippage = getDefaultSlippageDecimalPercentageForSwapper(validSwapperName)
      } catch {
        slippage = '0.01' // 1% default fallback
      }
    }

    // Build quote input
    const quoteInput = {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      affiliateBps: req.affiliateInfo?.affiliateBps!,
      allowMultiHop,
      slippageTolerancePercentageDecimal: slippage,
      receiveAddress,
      sendAddress,
      accountNumber,
      quoteOrRate: 'quote' as const,
      chainId: sellAsset.chainId,
      // EVM-specific fields
      supportsEIP1559: true,
    }

    // Fetch quote
    const result = await getTradeQuotes(
      quoteInput as GetTradeQuoteInputWithWallet,
      validSwapperName,
      deps,
    )

    if (!result) {
      res.status(404).json({
        error: 'No quote available from this swapper',
      } as ErrorResponse)
      return
    }

    if (result.isErr()) {
      const error = result.unwrapErr()
      res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
      } as ErrorResponse)
      return
    }

    const quotes = result.unwrap()
    if (quotes.length === 0) {
      res.status(404).json({ error: 'No quote available' } as ErrorResponse)
      return
    }

    // Use the first/best quote
    const quote = quotes[0] as TradeQuote
    const firstStep = quote.steps[0]

    // Calculate total buy amount (sum of all steps for multi-hop)
    const lastStep = quote.steps[quote.steps.length - 1]

    const quoteId = uuidv4()
    const now = Date.now()

    quoteStore.set(quoteId, {
      quoteId,
      swapperName: validSwapperName,
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      sellAmountCryptoBaseUnit: firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: lastStep.buyAmountAfterFeesCryptoBaseUnit,
      affiliateAddress: req.affiliateInfo?.affiliateAddress,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      affiliateBps: req.affiliateInfo?.affiliateBps!,
      sellChainId: sellAsset.chainId,
      receiveAddress,
      sendAddress,
      rate: quote.rate,
      createdAt: now,
      expiresAt: now + QuoteStore.QUOTE_TTL_MS,
      metadata: {
        chainflipSwapId: firstStep.chainflipSpecific?.chainflipSwapId,
        nearIntentsDepositAddress: firstStep.nearIntentsSpecific?.depositAddress,
        nearIntentsDepositMemo: firstStep.nearIntentsSpecific?.depositMemo,
        relayId: firstStep.relayTransactionMetadata?.relayId,
      },
      stepChainIds: quote.steps.map(step => step.sellAsset.chainId),
      status: 'pending',
    })

    const depositContextResult = await resolveDepositContext(quote, firstStep, validSwapperName)
    if (!depositContextResult.ok) {
      res.status(depositContextResult.statusCode).json(depositContextResult.error)
      return
    }
    const { context: depositContext } = depositContextResult

    const response: QuoteResponse = {
      quoteId,
      swapperName: validSwapperName,
      rate: quote.rate,
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit: firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit: lastStep.buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: lastStep.buyAmountAfterFeesCryptoBaseUnit,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      affiliateBps: req.affiliateInfo?.affiliateBps!,
      slippageTolerancePercentageDecimal: quote.slippageTolerancePercentageDecimal,
      networkFeeCryptoBaseUnit: firstStep.feeData.networkFeeCryptoBaseUnit,
      steps: quote.steps.map((step, index) =>
        transformQuoteStep(step, index === 0 ? depositContext : {}),
      ),
      approval: buildApprovalInfo(firstStep),
      expiresAt: now + 60_000,
      affiliateAddress: req.affiliateInfo?.affiliateAddress,
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getQuote:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}

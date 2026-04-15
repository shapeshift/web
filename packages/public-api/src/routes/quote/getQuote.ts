import { fromChainId } from '@shapeshiftoss/caip'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { GetTradeQuoteInputWithWallet } from '@shapeshiftoss/swapper'
import {
  getDefaultSlippageDecimalPercentageForSwapper,
  getTradeQuotes,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

import { getAsset } from '../../assets'
import { env } from '../../env'
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
      allowMultiHop,
      accountNumber,
    } = bodyResult.data

    const validSwapperName = Object.values(SwapperName).find(v => v === swapperName)
    if (!validSwapperName) {
      res.status(400).json({ error: `Unknown swapper: ${swapperName}` } satisfies ErrorResponse)
      return
    }

    const swapper = swappers[validSwapperName]
    if (!swapper) {
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

    const isEvmSell = fromChainId(sellAsset.chainId).chainNamespace === 'eip155'
    if (isEvmSell && !sendAddress) {
      res.status(400).json({
        error: 'sendAddress is required for EVM sell assets',
        code: 'MISSING_SEND_ADDRESS',
      } satisfies ErrorResponse)
      return
    }

    if (isEvmSell && !viemClientByChainId[sellAsset.chainId]) {
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
      allowMultiHop,
      slippageTolerancePercentageDecimal: slippage,
      receiveAddress,
      sendAddress,
      accountNumber,
      quoteOrRate: 'quote' as const,
      chainId: sellAsset.chainId,
    }

    const result = await getTradeQuotes(
      quoteInput as GetTradeQuoteInputWithWallet,
      validSwapperName,
      deps,
    )

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

    // Use the first/best quote
    const quote = quotes[0]
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
      affiliateBps: req.affiliateInfo?.affiliateBps ?? env.DEFAULT_AFFILIATE_BPS,
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
      affiliateBps: req.affiliateInfo?.affiliateBps ?? env.DEFAULT_AFFILIATE_BPS,
      slippageTolerancePercentageDecimal: quote.slippageTolerancePercentageDecimal,
      networkFeeCryptoBaseUnit: firstStep.feeData.networkFeeCryptoBaseUnit,
      steps: quote.steps.map((step, index) =>
        transformQuoteStep(step, index === 0 ? depositContext : {}),
      ),
      approval: sendAddress
        ? await buildApprovalInfo(firstStep, sendAddress)
        : { isRequired: false, spender: '' },
      expiresAt: now + 60_000,
      affiliateAddress: req.affiliateInfo?.affiliateAddress,
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getQuote:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}

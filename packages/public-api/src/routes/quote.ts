import { fromChainId } from '@shapeshiftoss/caip'
import type {
  GetTradeQuoteInputWithWallet,
  SwapperName,
  TradeQuote,
  TradeQuoteStep,
} from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

import { getAsset, getAssetsById } from '../assets'
import { DEFAULT_AFFILIATE_BPS } from '../config'
import { createServerSwapperDeps } from '../swapperDeps'
import type { ApiQuoteStep, ApprovalInfo, ErrorResponse, QuoteResponse } from '../types'

// Lazy load swapper to avoid import issues at module load time
let swapperModule: Awaited<ReturnType<typeof importSwapperModule>> | null = null
const importSwapperModule = () => import('@shapeshiftoss/swapper')
const getSwapperModule = async () => {
  if (!swapperModule) {
    swapperModule = await importSwapperModule()
  }
  return swapperModule
}

// Request validation schema - swapperName is string, validated later
export const QuoteRequestSchema = z.object({
  sellAssetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
  buyAssetId: z
    .string()
    .min(1)
    .openapi({ example: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' }),
  sellAmountCryptoBaseUnit: z.string().min(1).openapi({ example: '1000000000000000000' }),
  receiveAddress: z
    .string()
    .min(1)
    .openapi({ example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28' }),
  sendAddress: z
    .string()
    .optional()
    .openapi({ example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28' }),
  swapperName: z.string().min(1).openapi({ example: '0x' }),
  slippageTolerancePercentageDecimal: z.string().optional().openapi({ example: '0.01' }),
  allowMultiHop: z.boolean().optional().default(true).openapi({ example: true }),
  accountNumber: z.number().optional().default(0).openapi({ example: 0 }),
})

// Helper to extract transaction data from quote step
const extractTransactionData = (step: TradeQuoteStep): ApiQuoteStep['transactionData'] => {
  // Check for various swapper-specific transaction metadata
  if (step.zrxTransactionMetadata) {
    return {
      to: step.zrxTransactionMetadata.to,
      data: step.zrxTransactionMetadata.data,
      value: step.zrxTransactionMetadata.value,
      gasLimit: step.zrxTransactionMetadata.gas,
    }
  }

  if (step.portalsTransactionMetadata) {
    return {
      to: step.portalsTransactionMetadata.to,
      data: step.portalsTransactionMetadata.data,
      value: step.portalsTransactionMetadata.value,
      gasLimit: step.portalsTransactionMetadata.gasLimit,
    }
  }

  if (step.bebopTransactionMetadata) {
    return {
      to: step.bebopTransactionMetadata.to,
      data: step.bebopTransactionMetadata.data,
      value: step.bebopTransactionMetadata.value,
      gasLimit: step.bebopTransactionMetadata.gas,
    }
  }

  if (step.butterSwapTransactionMetadata) {
    return {
      to: step.butterSwapTransactionMetadata.to,
      data: step.butterSwapTransactionMetadata.data,
      value: step.butterSwapTransactionMetadata.value,
      gasLimit: step.butterSwapTransactionMetadata.gasLimit,
    }
  }

  // For THORChain/MAYAChain and other swappers, transaction is built differently
  // The consumer will need to use the quote data to build the transaction
  return undefined
}

// Helper to build approval info
const buildApprovalInfo = (step: TradeQuoteStep, _sellAssetId: string): ApprovalInfo => {
  const { chainNamespace } = fromChainId(step.sellAsset.chainId)

  // Only EVM tokens need approval
  if (chainNamespace !== 'eip155') {
    return { isRequired: false, spender: '' }
  }

  // Native assets don't need approval
  if (step.sellAsset.assetId.includes('slip44:60')) {
    return { isRequired: false, spender: '' }
  }

  // If there's an allowance contract, approval may be needed
  if (step.allowanceContract) {
    return {
      isRequired: true, // Consumer should check current allowance
      spender: step.allowanceContract,
      // Approval transaction data - consumer builds this themselves
      // or we could provide it if needed
    }
  }

  return { isRequired: false, spender: '' }
}

// Transform quote step to API format
const transformQuoteStep = (step: TradeQuoteStep): ApiQuoteStep => ({
  sellAsset: step.sellAsset,
  buyAsset: step.buyAsset,
  sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
  allowanceContract: step.allowanceContract,
  estimatedExecutionTimeMs: step.estimatedExecutionTimeMs,
  source: step.source,
  transactionData: extractTransactionData(step),
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

    // Lazy load swapper module
    const { getTradeQuotes, swappers, SwapperName, getDefaultSlippageDecimalPercentageForSwapper } =
      await getSwapperModule()

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
      res.status(400).json({ error: `Swapper not available: ${swapperName}` } as ErrorResponse)
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
    const deps = createServerSwapperDeps(getAssetsById())

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
      affiliateBps: DEFAULT_AFFILIATE_BPS,
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
      res.status(404).json({ error: 'No quote available from this swapper' } as ErrorResponse)
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

    // Build response
    const quoteId = uuidv4()
    const now = Date.now()

    const response: QuoteResponse = {
      quoteId,
      swapperName: validSwapperName,
      rate: quote.rate,
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit: firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit: lastStep.buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: lastStep.buyAmountAfterFeesCryptoBaseUnit,
      affiliateBps: quote.affiliateBps,
      slippageTolerancePercentageDecimal: quote.slippageTolerancePercentageDecimal,
      networkFeeCryptoBaseUnit: firstStep.feeData.networkFeeCryptoBaseUnit,
      steps: quote.steps.map(transformQuoteStep),
      approval: buildApprovalInfo(firstStep, sellAssetId),
      expiresAt: now + 60_000, // 60 second expiry
      quote, // Include full quote for advanced consumers
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getQuote:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}

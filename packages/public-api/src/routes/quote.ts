import { fromChainId } from '@shapeshiftoss/caip'
import type {
  GetTradeQuoteInputWithWallet,
  SwapperName,
  TradeQuote,
  TradeQuoteStep,
} from '@shapeshiftoss/swapper'
import { isNativeEvmAsset } from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

import { getAsset, getAssetsById } from '../assets'
import { DEFAULT_AFFILIATE_BPS, getServerConfig } from '../config'
import { booleanFromString } from '../lib/zod'
import { createServerSwapperDeps } from '../swapperDeps'
import type {
  ApiQuoteStep,
  ApprovalInfo,
  CosmosTransactionData,
  ErrorResponse,
  EvmTransactionData,
  QuoteResponse,
  SolanaTransactionData,
  TransactionData,
  UtxoTransactionData,
} from '../types'

type ThorLikeQuote = TradeQuote & { memo?: string }

let swapperModule: Awaited<ReturnType<typeof importSwapperModule>> | null = null
const importSwapperModule = () => import('@shapeshiftoss/swapper')
const getSwapperModule = async () => {
  if (!swapperModule) {
    swapperModule = await importSwapperModule()
  }
  return swapperModule
}

const fetchInboundAddress = async (
  assetId: string,
  swapperName: SwapperName,
): Promise<string | undefined> => {
  const { getInboundAddressDataForChain, getDaemonUrl } = await getSwapperModule()

  const config = getServerConfig()
  const daemonUrl = getDaemonUrl(config, swapperName)

  const result = await getInboundAddressDataForChain(daemonUrl, assetId, false, swapperName)

  if (result.isOk()) {
    return result.unwrap().address
  }

  return undefined
}

// Request validation schema - swapperName is string, validated later
export const QuoteRequestSchema = z.object({
  sellAssetId: z.string().min(1).openapi({ example: 'eip155:1/slip44:60' }),
  buyAssetId: z.string().min(1).openapi({
    example: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  }),
  sellAmountCryptoBaseUnit: z.string().min(1).openapi({ example: '1000000000000000000' }),
  receiveAddress: z
    .string()
    .min(1)
    .openapi({ example: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }),
  sendAddress: z
    .string()
    .optional()
    .openapi({ example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }),
  swapperName: z.string().min(1).openapi({ example: 'Relay' }),
  slippageTolerancePercentageDecimal: z.string().optional().openapi({ example: '0.01' }),
  allowMultiHop: booleanFromString.optional().default(true).openapi({ example: true }),
  accountNumber: z.coerce.number().optional().default(0).openapi({ example: 0 }),
})

const getEvmChainIdNumber = (chainId: string): number => {
  const { chainReference } = fromChainId(chainId)
  return parseInt(chainReference, 10)
}

const extractEvmTransactionData = (step: TradeQuoteStep): EvmTransactionData | undefined => {
  const chainId = getEvmChainIdNumber(step.sellAsset.chainId)

  if (step.zrxTransactionMetadata) {
    const txData: EvmTransactionData = {
      type: 'evm',
      chainId,
      to: step.zrxTransactionMetadata.to,
      data: step.zrxTransactionMetadata.data,
      value: step.zrxTransactionMetadata.value,
      gasLimit: step.zrxTransactionMetadata.gas,
    }
    if (step.permit2Eip712) {
      txData.signatureRequired = {
        type: 'permit2',
        eip712: step.permit2Eip712,
      }
    }
    return txData
  }

  if (step.portalsTransactionMetadata) {
    return {
      type: 'evm',
      chainId,
      to: step.portalsTransactionMetadata.to,
      data: step.portalsTransactionMetadata.data,
      value: step.portalsTransactionMetadata.value,
      gasLimit: step.portalsTransactionMetadata.gasLimit,
    }
  }

  if (step.bebopTransactionMetadata) {
    return {
      type: 'evm',
      chainId,
      to: step.bebopTransactionMetadata.to,
      data: step.bebopTransactionMetadata.data,
      value: step.bebopTransactionMetadata.value,
      gasLimit: step.bebopTransactionMetadata.gas,
    }
  }

  if (step.butterSwapTransactionMetadata) {
    return {
      type: 'evm',
      chainId,
      to: step.butterSwapTransactionMetadata.to,
      data: step.butterSwapTransactionMetadata.data,
      value: step.butterSwapTransactionMetadata.value,
      gasLimit: step.butterSwapTransactionMetadata.gasLimit,
    }
  }

  if (step.relayTransactionMetadata?.to && step.relayTransactionMetadata?.data) {
    return {
      type: 'evm',
      chainId,
      to: step.relayTransactionMetadata.to,
      data: step.relayTransactionMetadata.data,
      value: step.relayTransactionMetadata.value ?? '0',
      gasLimit: step.relayTransactionMetadata.gasLimit,
    }
  }

  return undefined
}

const extractSolanaTransactionData = (step: TradeQuoteStep): SolanaTransactionData | undefined => {
  if (!step.solanaTransactionMetadata?.instructions) {
    return undefined
  }

  const instructions = step.solanaTransactionMetadata.instructions.map(ix => ({
    programId: ix.programId.toBase58(),
    keys: ix.keys.map(key => ({
      pubkey: key.pubkey.toBase58(),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(ix.data).toString('base64'),
  }))

  return {
    type: 'solana',
    instructions,
    addressLookupTableAddresses: step.solanaTransactionMetadata.addressLookupTableAddresses,
  }
}

type DepositExtractionContext = {
  memo?: string
  depositAddress?: string
}

const extractUtxoTransactionData = (
  step: TradeQuoteStep,
  context: DepositExtractionContext = {},
): UtxoTransactionData | undefined => {
  if (step.relayTransactionMetadata?.psbt) {
    return {
      type: 'utxo_psbt',
      psbt: step.relayTransactionMetadata.psbt,
      opReturnData: step.relayTransactionMetadata.opReturnData,
    }
  }

  if (step.chainflipSpecific?.chainflipDepositAddress) {
    return {
      type: 'utxo_deposit',
      depositAddress: step.chainflipSpecific.chainflipDepositAddress,
      memo: '',
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    }
  }

  if (context.depositAddress && context.memo !== undefined) {
    return {
      type: 'utxo_deposit',
      depositAddress: context.depositAddress,
      memo: context.memo,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    }
  }

  return undefined
}

const extractCosmosTransactionData = (
  step: TradeQuoteStep,
  context: DepositExtractionContext = {},
): CosmosTransactionData | undefined => {
  if (context.depositAddress && context.memo !== undefined) {
    return {
      type: 'cosmos',
      chainId: step.sellAsset.chainId,
      to: context.depositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      memo: context.memo,
    }
  }

  return undefined
}

const extractTransactionData = (
  step: TradeQuoteStep,
  context: DepositExtractionContext = {},
): TransactionData | undefined => {
  const { chainNamespace } = fromChainId(step.sellAsset.chainId)

  if (chainNamespace === 'eip155') {
    return extractEvmTransactionData(step)
  }

  if (chainNamespace === 'solana') {
    return extractSolanaTransactionData(step)
  }

  if (chainNamespace === 'bip122') {
    return extractUtxoTransactionData(step, context)
  }

  if (chainNamespace === 'cosmos') {
    return extractCosmosTransactionData(step, context)
  }

  return undefined
}

const buildApprovalInfo = (step: TradeQuoteStep, _sellAssetId: string): ApprovalInfo => {
  const { chainNamespace } = fromChainId(step.sellAsset.chainId)

  if (chainNamespace !== 'eip155') {
    return { isRequired: false, spender: '' }
  }

  if (isNativeEvmAsset(step.sellAsset.assetId)) {
    return { isRequired: false, spender: '' }
  }

  if (step.allowanceContract) {
    return {
      isRequired: true,
      spender: step.allowanceContract,
    }
  }

  return { isRequired: false, spender: '' }
}

// Transform quote step to API format
const transformQuoteStep = (
  step: TradeQuoteStep,
  context: DepositExtractionContext = {},
): ApiQuoteStep => ({
  sellAsset: step.sellAsset,
  buyAsset: step.buyAsset,
  sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
  allowanceContract: step.allowanceContract,
  estimatedExecutionTimeMs: step.estimatedExecutionTimeMs,
  source: step.source,
  transactionData: extractTransactionData(step, context),
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

    const thorLikeQuote = quote as ThorLikeQuote
    let depositContext: DepositExtractionContext = {}

    if (thorLikeQuote.memo) {
      const { chainNamespace } = fromChainId(firstStep.sellAsset.chainId)
      if (chainNamespace === 'bip122' || chainNamespace === 'cosmos') {
        const depositAddress = await fetchInboundAddress(
          firstStep.sellAsset.assetId,
          validSwapperName,
        )
        if (depositAddress) {
          depositContext = {
            memo: thorLikeQuote.memo,
            depositAddress,
          }
        }
      }
    }

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
      steps: quote.steps.map(step => transformQuoteStep(step, depositContext)),
      approval: buildApprovalInfo(firstStep, sellAssetId),
      expiresAt: now + 60_000,
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getQuote:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}

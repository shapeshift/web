import { btcChainId, fromAssetId, solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero, DAO_TREASURY_NEAR, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import type { SwapErrorRight, TradeAmount } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import {
  BTC_QUOTE_DEADLINE_MS,
  DEFAULT_QUOTE_DEADLINE_MS,
  DEFAULT_SLIPPAGE_BPS,
} from '../constants'
import type { GetExecutionStatusResponse, QuoteResponse, TokenResponse } from '../types'
import { chainIdToNearIntentsChain, QuoteRequest } from '../types'
import { ApiError, OneClickService } from './oneClickService'

const getTokensWithRetry = async (): Promise<TokenResponse[]> => {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await OneClickService.getTokens()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const isWebSocketError = lastError.message.includes('WebSocket is not ready')

      if (isWebSocketError && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
      throw lastError
    }
  }

  throw lastError ?? new Error('Failed to get tokens after retries')
}

export const getNearIntentsAsset = ({
  nearNetwork,
  contractAddress,
}: {
  nearNetwork: string
  contractAddress: string
}): string => {
  // Native EVM assets: "nep141:eth.omft.near"
  if (contractAddress === zeroAddress) {
    return `nep141:${nearNetwork}.omft.near`
  }
  // ERC20 tokens: "nep141:eth-0x{address}.omft.near"
  return `nep141:${nearNetwork}-${contractAddress.toLowerCase()}.omft.near`
}

const NEP245_CHAINS = ['bsc', 'pol', 'avax', 'op', 'tron', 'monad', 'plasma'] as const
const TOKEN_LOOKUP_CHAINS = ['sui', 'starknet', 'ton'] as const
const NEAR_CHAIN = 'near' as const
const BTC_CHAIN = 'btc' as const
const WNEAR_CONTRACT_ADDRESS = 'wrap.near' as const

type Nep245Chain = (typeof NEP245_CHAINS)[number]
type TokenLookupChain = (typeof TOKEN_LOOKUP_CHAINS)[number]

const isNep245Chain = (chain: string): chain is Nep245Chain => {
  return NEP245_CHAINS.includes(chain as Nep245Chain)
}

const isTokenLookupChain = (chain: string): chain is TokenLookupChain => {
  return TOKEN_LOOKUP_CHAINS.includes(chain as TokenLookupChain)
}

export const assetToNearIntentsAsset = async (asset: Asset): Promise<string | null> => {
  const nearNetwork =
    chainIdToNearIntentsChain[asset.chainId as keyof typeof chainIdToNearIntentsChain]

  if (!nearNetwork) return null

  // https://partners.near-intents.org/omni-migration#partners
  if (nearNetwork === BTC_CHAIN) return `1cs_v1:btc:native:coin`

  // NEAR chain requires special handling
  // Native NEAR maps to wNEAR (wrap.near)
  if (nearNetwork === NEAR_CHAIN) {
    const tokens = await getTokensWithRetry()
    const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
    const isNativeAsset = assetNamespace === 'slip44'

    // Native NEAR maps to wNEAR, tokens use their contract address directly
    const contractAddress = isNativeAsset ? WNEAR_CONTRACT_ADDRESS : assetReference

    const match = tokens.find((t: TokenResponse) => {
      if (t.blockchain !== NEAR_CHAIN) return false
      return t.contractAddress === contractAddress
    })

    return match?.assetId ?? null
  }

  // NEP-245 chains (BSC, Polygon, Avalanche, Optimism, TRON, Monad), Token lookup chains (Sui, Starknet), and Solana require token lookup
  // Asset IDs use hashed format that can't be generated from contract addresses
  const requiresLookup =
    isNep245Chain(nearNetwork) || isTokenLookupChain(nearNetwork) || asset.chainId === solanaChainId

  if (requiresLookup) {
    const tokens = await getTokensWithRetry()

    const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
    const isNativeAsset = assetNamespace === 'slip44'
    const contractAddress = !isNativeAsset ? assetReference.toLowerCase() : null

    const match = tokens.find((t: TokenResponse) => {
      if (typeof t.blockchain !== 'string' || t.blockchain !== nearNetwork) return false
      return contractAddress
        ? t.contractAddress?.toLowerCase() === contractAddress
        : !t.contractAddress
    })

    if (!match) {
      return null
    }

    return match.assetId
  }

  // NEP-141 chains (ETH, ARB, BASE, GNOSIS, DOGE): use predictable format
  const contractAddress = isToken(asset.assetId)
    ? fromAssetId(asset.assetId).assetReference
    : zeroAddress

  return getNearIntentsAsset({ nearNetwork, contractAddress })
}

export const resolveNearIntentsAssets = async ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Promise<Result<{ originAsset: string; destinationAsset: string }, SwapErrorRight>> => {
  try {
    const originAsset = await assetToNearIntentsAsset(sellAsset)
    const destinationAsset = await assetToNearIntentsAsset(buyAsset)

    if (!originAsset) {
      return Err(
        makeSwapErrorRight({
          code: TradeQuoteError.UnsupportedTradePair,
          message: `Asset ${sellAsset.symbol} on ${
            sellAsset.networkName || sellAsset.chainId
          } is not supported by NEAR Intents`,
        }),
      )
    }

    if (!destinationAsset) {
      return Err(
        makeSwapErrorRight({
          code: TradeQuoteError.UnsupportedTradePair,
          message: `Asset ${buyAsset.symbol} on ${
            buyAsset.networkName || buyAsset.chainId
          } is not supported by NEAR Intents`,
        }),
      )
    }

    return Ok({ originAsset, destinationAsset })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Failed to resolve NEAR Intents assets',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}

// BTC deposits confirm slowly, so BTC pairs get a longer deadline
export const getNearIntentsQuoteDeadline = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): string => {
  const deadlineMs =
    sellAsset.chainId === btcChainId || buyAsset.chainId === btcChainId
      ? BTC_QUOTE_DEADLINE_MS
      : DEFAULT_QUOTE_DEADLINE_MS

  return new Date(Date.now() + deadlineMs).toISOString()
}

export const buildNearIntentsQuoteRequest = ({
  originAsset,
  destinationAsset,
  amount,
  slippageTolerancePercentageDecimal,
  affiliateBps,
  refundTo,
  recipient,
  refundType,
  recipientType,
  deadline,
}: {
  originAsset: string
  destinationAsset: string
  amount: TradeAmount
  slippageTolerancePercentageDecimal: string | undefined
  affiliateBps: string
  refundTo: string
  recipient: string
  refundType: QuoteRequest.refundType
  recipientType: QuoteRequest.recipientType
  deadline: string
}): QuoteRequest => {
  return {
    dry: false,
    swapType:
      amount.direction === 'exactOut'
        ? QuoteRequest.swapType.EXACT_OUTPUT
        : QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: slippageTolerancePercentageDecimal
      ? bnOrZero(slippageTolerancePercentageDecimal).times(10000).toNumber()
      : DEFAULT_SLIPPAGE_BPS,
    originAsset,
    destinationAsset,
    amount: amount.cryptoBaseUnit,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    refundTo,
    refundType,
    recipient,
    recipientType,
    deadline,
    referral: 'shapeshift',
    appFees: [
      {
        recipient: DAO_TREASURY_NEAR,
        fee: Number(affiliateBps),
      },
    ],
  }
}

// One retry loop for the SDK's flaky WebSocket transport; maps provider errors to swap errors
export const fetchNearIntentsQuote = async ({
  quoteRequest,
  sellAsset,
}: {
  quoteRequest: QuoteRequest
  sellAsset: Asset
}): Promise<Result<QuoteResponse, SwapErrorRight>> => {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return Ok(await OneClickService.getQuote(quoteRequest))
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const isWebSocketError = lastError.message.includes('WebSocket is not ready')

      if (isWebSocketError && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
      break
    }
  }

  const error = lastError ?? new Error('Failed to get quote after retries')

  if (error instanceof ApiError) {
    if (
      error.body?.message === 'tokenIn is not valid' ||
      error.body?.message === 'tokenOut is not valid'
    ) {
      return Err(
        makeSwapErrorRight({
          code: TradeQuoteError.UnsupportedTradePair,
          message: 'Unsupported asset',
        }),
      )
    }

    if (error.body?.message?.includes('Amount is too low')) {
      const match = error.body.message.match(/try at least (\d+)/)
      if (match) {
        return Err(
          createTradeAmountTooSmallErr({
            minAmountCryptoBaseUnit: match[1],
            assetId: sellAsset.assetId,
          }),
        )
      }
    }
  }

  return Err(
    makeSwapErrorRight({
      message: error instanceof Error ? error.message : 'Unknown error getting NEAR Intents quote',
      code: TradeQuoteError.QueryFailed,
      cause: error,
    }),
  )
}

export const mapNearIntentsStatus = (status: GetExecutionStatusResponse['status']): TxStatus => {
  switch (status) {
    case 'PENDING_DEPOSIT':
    case 'KNOWN_DEPOSIT_TX':
    case 'PROCESSING':
      return TxStatus.Pending
    case 'SUCCESS':
      return TxStatus.Confirmed
    case 'INCOMPLETE_DEPOSIT':
    case 'REFUNDED':
    case 'FAILED':
      return TxStatus.Failed
    default:
      return TxStatus.Unknown
  }
}

export const getNearIntentsStatusMessage = (
  status: GetExecutionStatusResponse['status'],
): string | undefined => {
  switch (status) {
    case 'PENDING_DEPOSIT':
      return 'Waiting for deposit...'
    case 'KNOWN_DEPOSIT_TX':
      return 'Deposit detected, waiting for confirmation...'
    case 'PROCESSING':
      return 'Processing swap...'
    case 'SUCCESS':
      return undefined
    case 'INCOMPLETE_DEPOSIT':
      return 'Insufficient deposit amount'
    case 'REFUNDED':
      return 'Swap failed, funds refunded'
    case 'FAILED':
      return 'Swap failed'
    default:
      return 'Unknown status'
  }
}

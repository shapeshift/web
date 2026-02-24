import { fromAssetId, isAssetReference } from '@shapeshiftoss/caip'
import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  BigAmount,
  bnOrZero,
  chainIdToFeeAssetId,
  getBaseAsset,
  isTreasuryChainId,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import { zeroAddress } from 'viem'

import type {
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteStep,
  TradeRate,
  TradeRateStep,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../utils/helpers/helpers'
import {
  chainIdToDebridgeChainId,
  debridgeChainIdToChainId,
  DEFAULT_DEBRIDGE_TOKEN_ADDRESS,
  DEFAULT_DEBRIDGE_USER_ADDRESS,
} from '../constant'
import { fetchDebridgeSingleChainTrade } from './fetchDebridgeSingleChainTrade'
import { fetchDebridgeTrade } from './fetchDebridgeTrade'
import type { DebridgeTradeInputParams, DebridgeTransactionMetadata } from './types'
import { isDebridgeError } from './types'

const getDebridgeAssetAddress = (assetId: string): string => {
  if (isNativeEvmAsset(assetId)) return DEFAULT_DEBRIDGE_TOKEN_ADDRESS

  const { assetReference } = fromAssetId(assetId)
  return isAssetReference(assetReference) ? zeroAddress : assetReference
}

export async function getTrade(args: {
  input: DebridgeTradeInputParams<'quote'>
  deps: SwapperDeps
}): Promise<Result<TradeQuote[], SwapErrorRight>>

export async function getTrade(args: {
  input: DebridgeTradeInputParams<'rate'>
  deps: SwapperDeps
}): Promise<Result<TradeRate[], SwapErrorRight>>

export async function getTrade<T extends 'quote' | 'rate'>({
  input,
  deps,
}: {
  input: DebridgeTradeInputParams<T>
  deps: SwapperDeps
}): Promise<Result<TradeQuote[] | TradeRate[], SwapErrorRight>> {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const isSameChainSwap = sellAsset.chainId === buyAsset.chainId

  const sellDebridgeChainId = chainIdToDebridgeChainId[sellAsset.chainId]

  if (sellDebridgeChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Sell asset chain '${sellAsset.chainId}' not supported by deBridge`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (!isSameChainSwap) {
    const buyDebridgeChainId = chainIdToDebridgeChainId[buyAsset.chainId]
    if (buyDebridgeChainId === undefined) {
      return Err(
        makeSwapErrorRight({
          message: `Buy asset chain '${buyAsset.chainId}' not supported by deBridge`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
    }
  }

  const senderAddress = (() => {
    if (input.quoteOrRate === 'rate') {
      if (input.sendAddress) return input.sendAddress
      return DEFAULT_DEBRIDGE_USER_ADDRESS
    }
    return input.sendAddress ?? DEFAULT_DEBRIDGE_USER_ADDRESS
  })()

  const recipientAddress = (() => {
    if (input.quoteOrRate === 'rate') {
      if (input.receiveAddress) return input.receiveAddress
      return DEFAULT_DEBRIDGE_USER_ADDRESS
    }
    return input.receiveAddress
  })()

  const affiliateFeePercent = (() => {
    if (!isTreasuryChainId(buyAsset.chainId)) return undefined
    const bps = bnOrZero(affiliateBps)
    if (!bps.isFinite() || bps.lte(0)) return undefined
    return bps.div(100).toFixed()
  })()

  const affiliateFeeRecipient = (() => {
    if (affiliateFeePercent === undefined) return undefined
    try {
      return getTreasuryAddressFromChainId(buyAsset.chainId).toLowerCase()
    } catch (e) {
      console.error(
        `[getTrade] Failed to get treasury address for chainId ${buyAsset.chainId}, affiliate fee will not be applied`,
        e,
      )
      return undefined
    }
  })()

  if (isSameChainSwap) {
    return getSameChainTrade({
      input,
      deps,
      sellDebridgeChainId,
      senderAddress,
      recipientAddress,
      affiliateFeePercent,
      affiliateFeeRecipient,
    })
  }

  const buyDebridgeChainId = chainIdToDebridgeChainId[buyAsset.chainId]
  if (buyDebridgeChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Buy asset chain '${buyAsset.chainId}' not supported by deBridge`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const maybeQuote = await fetchDebridgeTrade(
    {
      srcChainId: sellDebridgeChainId,
      srcChainTokenIn: getDebridgeAssetAddress(sellAsset.assetId),
      srcChainTokenInAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      dstChainId: buyDebridgeChainId,
      dstChainTokenOut: getDebridgeAssetAddress(buyAsset.assetId),
      dstChainTokenOutAmount: 'auto',
      dstChainTokenOutRecipient: recipientAddress,
      srcChainOrderAuthorityAddress: senderAddress,
      dstChainOrderAuthorityAddress: recipientAddress,
      senderAddress,
      prependOperatingExpenses: 'true',
      affiliateFeePercent,
      affiliateFeeRecipient,
    },
    deps.config,
  )

  if (maybeQuote.isErr()) {
    return handleDebridgeError(maybeQuote.unwrapErr())
  }

  const { data: quote } = maybeQuote.unwrap()

  const buyAmountAfterFeesCryptoBaseUnit = quote.estimation.dstChainTokenOut.recommendedAmount

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const nativePreFee = bnOrZero(quote.fixFee)
    .plus(bnOrZero(quote.prependedOperatingExpenseCost))
    .toFixed()

  const buyAmountBeforeFeesCryptoBaseUnit = buyAmountAfterFeesCryptoBaseUnit

  const allowanceContract = isEvmChainId(sellAsset.chainId) ? quote.tx.to : ''

  const debridgeTransactionMetadata: DebridgeTransactionMetadata = {
    to: quote.tx.to,
    data: quote.tx.data,
    value: quote.tx.value,
    orderId: quote.orderId,
    gasLimit: quote.estimatedTransactionFee?.details.gasLimit,
  }

  const networkFeeCryptoBaseUnit = await getNetworkFee({
    sellAsset,
    debridgeTransactionMetadata,
    senderAddress,
    deps,
  })

  const protocolFeeAssetCaipChainId = debridgeChainIdToChainId[sellDebridgeChainId.toString()]

  const protocolFeeAssetIdForFees = (() => {
    if (!protocolFeeAssetCaipChainId) return undefined
    return chainIdToFeeAssetId(protocolFeeAssetCaipChainId)
  })()

  const accountNumber = input.accountNumber

  const step: TradeQuoteStep | TradeRateStep = {
    allowanceContract,
    rate,
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAsset,
    sellAsset,
    accountNumber,
    feeData: {
      networkFeeCryptoBaseUnit,
      protocolFees:
        protocolFeeAssetIdForFees && bnOrZero(nativePreFee).gt(0)
          ? {
              [protocolFeeAssetIdForFees]: {
                amountCryptoBaseUnit: nativePreFee,
                asset: getBaseAsset(sellAsset.chainId),
                requiresBalance: true,
              },
            }
          : {},
    },
    source: SwapperName.Debridge,
    estimatedExecutionTimeMs: quote.order.approximateFulfillmentDelay * 1000,
    debridgeTransactionMetadata,
  }

  const baseQuoteOrRate = {
    id: quote.orderId,
    rate,
    swapperName: SwapperName.Debridge,
    affiliateBps,
    slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
  }

  if (input.quoteOrRate === 'quote') {
    if (!input.receiveAddress) {
      return Err(
        makeSwapErrorRight({
          message: 'Receive address is required for quote',
          code: TradeQuoteError.InternalError,
        }),
      )
    }

    const tradeQuote: TradeQuote = {
      ...baseQuoteOrRate,
      steps: [step as TradeQuoteStep],
      receiveAddress: input.receiveAddress,
      quoteOrRate: 'quote' as const,
    }

    return Ok([tradeQuote])
  }

  const tradeRate: TradeRate = {
    ...baseQuoteOrRate,
    steps: [step as TradeRateStep],
    receiveAddress: recipientAddress,
    quoteOrRate: 'rate' as const,
  }

  return Ok([tradeRate])
}

function handleDebridgeError(error: SwapErrorRight): Result<never, SwapErrorRight> {
  if (!axios.isAxiosError(error.cause)) {
    return Err(
      makeSwapErrorRight({
        message: 'Unknown error',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const debridgeError = error.cause?.response?.data

  if (!isDebridgeError(debridgeError)) {
    return Err(
      makeSwapErrorRight({
        message: 'Unknown error',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const errorMessage = debridgeError.errorMessage ?? debridgeError.message ?? 'Unknown error'

  return Err(
    makeSwapErrorRight({
      message: errorMessage,
      code: TradeQuoteError.UnknownError,
    }),
  )
}

async function getNetworkFee({
  sellAsset,
  debridgeTransactionMetadata,
  senderAddress,
  deps,
}: {
  sellAsset: { chainId: string }
  debridgeTransactionMetadata: DebridgeTransactionMetadata
  senderAddress: string
  deps: SwapperDeps
}): Promise<string | undefined> {
  if (!isEvmChainId(sellAsset.chainId)) return undefined

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const { average } = await adapter.getGasFeeData()
  const supportsEIP1559 = 'maxFeePerGas' in average

  try {
    const feeData = await evm.getFees({
      adapter,
      data: debridgeTransactionMetadata.data,
      to: debridgeTransactionMetadata.to,
      value: debridgeTransactionMetadata.value,
      from: senderAddress,
      supportsEIP1559,
    })

    return feeData.networkFeeCryptoBaseUnit
  } catch {
    const gasLimitFromApi = debridgeTransactionMetadata.gasLimit
    if (!gasLimitFromApi) return undefined

    return evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      gasLimit: gasLimitFromApi,
      supportsEIP1559,
    })
  }
}

async function getSameChainTrade<T extends 'quote' | 'rate'>({
  input,
  deps,
  sellDebridgeChainId,
  senderAddress,
  recipientAddress,
  affiliateFeePercent,
  affiliateFeeRecipient,
}: {
  input: DebridgeTradeInputParams<T>
  deps: SwapperDeps
  sellDebridgeChainId: number
  senderAddress: string
  recipientAddress: string | undefined
  affiliateFeePercent: string | undefined
  affiliateFeeRecipient: string | undefined
}): Promise<Result<TradeQuote[] | TradeRate[], SwapErrorRight>> {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const slippage = input.slippageTolerancePercentageDecimal
    ? bnOrZero(input.slippageTolerancePercentageDecimal).times(100).toFixed()
    : '5'

  const maybeQuote = await fetchDebridgeSingleChainTrade(
    {
      chainId: sellDebridgeChainId,
      tokenIn: getDebridgeAssetAddress(sellAsset.assetId),
      tokenInAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      tokenOut: getDebridgeAssetAddress(buyAsset.assetId),
      tokenOutRecipient: recipientAddress,
      senderAddress,
      slippage,
      affiliateFeePercent,
      affiliateFeeRecipient,
    },
    deps.config,
  )

  if (maybeQuote.isErr()) {
    return handleDebridgeError(maybeQuote.unwrapErr())
  }

  const { data: quote } = maybeQuote.unwrap()

  const buyAmountAfterFeesCryptoBaseUnit = quote.tokenOut.amount

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const protocolFeeAmount = quote.protocolFee ?? '0'

  const buyAmountBeforeFeesCryptoBaseUnit = (() => {
    if (protocolFeeAmount === '0') return buyAmountAfterFeesCryptoBaseUnit

    return BigAmount.fromBaseUnit({
      value: buyAmountAfterFeesCryptoBaseUnit,
      precision: buyAsset.precision,
    })
      .plus(
        BigAmount.fromBaseUnit({
          value: protocolFeeAmount,
          precision: buyAsset.precision,
        }),
      )
      .toBaseUnit()
  })()

  const allowanceContract = isEvmChainId(sellAsset.chainId) ? quote.tx.to : ''

  const debridgeTransactionMetadata: DebridgeTransactionMetadata = {
    to: quote.tx.to,
    data: quote.tx.data,
    value: quote.tx.value,
    gasLimit: quote.estimatedTransactionFee?.details.gasLimit,
    isSameChainSwap: true,
  }

  const networkFeeCryptoBaseUnit = await getNetworkFee({
    sellAsset,
    debridgeTransactionMetadata,
    senderAddress,
    deps,
  })

  const tradeId = uuid()

  const step: TradeQuoteStep | TradeRateStep = {
    allowanceContract,
    rate,
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAsset,
    sellAsset,
    accountNumber: input.accountNumber,
    feeData: {
      networkFeeCryptoBaseUnit,
      protocolFees:
        protocolFeeAmount !== '0'
          ? {
              [buyAsset.assetId]: {
                amountCryptoBaseUnit: protocolFeeAmount,
                asset: {
                  symbol: quote.tokenOut.symbol,
                  chainId: buyAsset.chainId,
                  precision: buyAsset.precision,
                },
                requiresBalance: false,
              },
            }
          : {},
    },
    source: SwapperName.Debridge,
    estimatedExecutionTimeMs: 15_000,
    debridgeTransactionMetadata,
  }

  const baseQuoteOrRate = {
    id: tradeId,
    rate,
    swapperName: SwapperName.Debridge,
    affiliateBps,
    slippageTolerancePercentageDecimal:
      input.slippageTolerancePercentageDecimal ??
      (quote.slippage ? bnOrZero(quote.slippage).div(100).toString() : undefined),
  }

  if (input.quoteOrRate === 'quote') {
    if (!input.receiveAddress) {
      return Err(
        makeSwapErrorRight({
          message: 'Receive address is required for quote',
          code: TradeQuoteError.InternalError,
        }),
      )
    }

    const tradeQuote: TradeQuote = {
      ...baseQuoteOrRate,
      steps: [step as TradeQuoteStep],
      receiveAddress: input.receiveAddress,
      quoteOrRate: 'quote' as const,
    }

    return Ok([tradeQuote])
  }

  const tradeRate: TradeRate = {
    ...baseQuoteOrRate,
    steps: [step as TradeRateStep],
    receiveAddress: recipientAddress,
    quoteOrRate: 'rate' as const,
  }

  return Ok([tradeRate])
}

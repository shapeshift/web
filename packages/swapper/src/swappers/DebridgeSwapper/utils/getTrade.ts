import { fromAssetId, isAssetReference } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
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
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
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
import { getDebridgeStepData } from './getDebridgeStepData'
import { isDebridgeError } from './types'

const getDebridgeAssetAddress = (assetId: string): string => {
  if (isNativeEvmAsset(assetId)) return DEFAULT_DEBRIDGE_TOKEN_ADDRESS

  const { assetReference } = fromAssetId(assetId)

  return isAssetReference(assetReference) ? zeroAddress : assetReference
}

export async function getTrade(args: {
  input: GetEvmTradeQuoteInputBase
  deps: SwapperDeps
}): Promise<Result<TradeQuote[], SwapErrorRight>>

export async function getTrade(args: {
  input: GetEvmTradeRateInput
  deps: SwapperDeps
}): Promise<Result<TradeRate[], SwapErrorRight>>

export async function getTrade({
  input,
  deps,
}: {
  input: GetEvmTradeQuoteInputBase | GetEvmTradeRateInput
  deps: SwapperDeps
}): Promise<Result<TradeQuote[] | TradeRate[], SwapErrorRight>> {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const sellDebridgeChainId = chainIdToDebridgeChainId[sellAsset.chainId]
  if (sellDebridgeChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Sell asset chain '${sellAsset.chainId}' not supported by deBridge`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const isSameChainSwap = sellAsset.chainId === buyAsset.chainId
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

  const senderAddress = input.sendAddress ?? DEFAULT_DEBRIDGE_USER_ADDRESS
  const recipientAddress = input.receiveAddress ?? DEFAULT_DEBRIDGE_USER_ADDRESS

  const affiliateFeePercent = (() => {
    if (!isTreasuryChainId(sellAsset.chainId)) return

    const bps = bnOrZero(affiliateBps)
    if (!bps.isFinite() || bps.lte(0)) return

    return bps.div(100).toFixed()
  })()

  const affiliateFeeRecipient = (() => {
    if (affiliateFeePercent === undefined) return

    try {
      return getTreasuryAddressFromChainId(sellAsset.chainId).toLowerCase()
    } catch (e) {
      console.error(
        `[getTrade] Failed to get treasury address for chainId ${sellAsset.chainId}, affiliate fee will not be applied`,
        e,
      )
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
      prependOperatingExpenses: 'false',
      affiliateFeePercent,
      affiliateFeeRecipient,
    },
    deps.config,
  )

  if (maybeQuote.isErr()) return handleDebridgeError(maybeQuote.unwrapErr())
  const { data: quote } = maybeQuote.unwrap()

  const buyAmountAfterFeesCryptoBaseUnit = quote.estimation.dstChainTokenOut.recommendedAmount

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const fixFee = bnOrZero(quote.fixFee).toFixed()

  const buyAmountBeforeFeesCryptoBaseUnit = buyAmountAfterFeesCryptoBaseUnit

  const allowanceContract = isEvmChainId(sellAsset.chainId) ? quote.tx.to : ''

  const { transactionData, networkFeeCryptoBaseUnit } = await getDebridgeStepData({
    tx: quote.tx,
    gasLimit: quote.estimatedTransactionFee?.details.gasLimit,
    fallbackNetworkFeeCryptoBaseUnit: quote.estimatedTransactionFee?.total,
    sellAsset,
    from: senderAddress,
    supportsEIP1559: input.supportsEIP1559,
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
        protocolFeeAssetIdForFees && bnOrZero(fixFee).gt(0)
          ? {
              [protocolFeeAssetIdForFees]: {
                amountCryptoBaseUnit: fixFee,
                asset: getBaseAsset(sellAsset.chainId),
                requiresBalance: true,
              },
            }
          : {},
    },
    source: SwapperName.Debridge,
    estimatedExecutionTimeMs: quote.order.approximateFulfillmentDelay * 1000,
    swapperMetadata: { name: 'debridge', isSameChainSwap },
    transactionData,
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
    return Err(makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }))
  }

  const debridgeError = error.cause?.response?.data

  if (!isDebridgeError(debridgeError)) {
    return Err(makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }))
  }

  const errorMessage = debridgeError.errorMessage ?? debridgeError.message ?? 'Unknown error'

  return Err(makeSwapErrorRight({ message: errorMessage, code: TradeQuoteError.UnknownError }))
}

async function getSameChainTrade({
  input,
  deps,
  sellDebridgeChainId,
  senderAddress,
  recipientAddress,
  affiliateFeePercent,
  affiliateFeeRecipient,
}: {
  input: GetEvmTradeQuoteInputBase | GetEvmTradeRateInput
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

  if (maybeQuote.isErr()) return handleDebridgeError(maybeQuote.unwrapErr())
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

  const { transactionData, networkFeeCryptoBaseUnit } = await getDebridgeStepData({
    tx: quote.tx,
    gasLimit: quote.estimatedTransactionFee?.details.gasLimit,
    fallbackNetworkFeeCryptoBaseUnit: quote.estimatedTransactionFee?.total,
    sellAsset,
    from: senderAddress,
    supportsEIP1559: input.supportsEIP1559,
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
    swapperMetadata: { name: 'debridge', isSameChainSwap: true },
    transactionData,
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

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
import { v4 as uuid } from 'uuid'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import { debridgeChainIdToChainId } from '../constant'
import { fetchDebridgeSingleChainTrade } from './fetchDebridgeSingleChainTrade'
import { fetchDebridgeTrade } from './fetchDebridgeTrade'
import type { GetDebridgeStepDataArgs } from './getDebridgeStepData'
import { assertValidTrade, getDebridgeAssetAddress, handleDebridgeError } from './helpers'
import type {
  DebridgeMetadata,
  DebridgeTradeQuoteInput,
  DebridgeTradeRateInput,
  DebridgeTx,
} from './types'

type DebridgeTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetDebridgeStepDataArgs, 'type' | 'input'>
}

// Both provider flows (cross-chain, same-chain) map their distinct responses to this shape, so the
// context assembly is single-sourced
type NormalizedDebridgeQuote = {
  id: string
  buyAmountBeforeFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  protocolFees: QuoteFeeData['protocolFees']
  estimatedExecutionTimeMs: number
  isSameChainSwap: boolean
  slippageTolerancePercentageDecimal: string | undefined
  tx: DebridgeTx
  gasLimit: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string | undefined
}

type FetchQuoteArgs = {
  input: DebridgeTradeQuoteInput | DebridgeTradeRateInput
  deps: SwapperDeps
  sellDebridgeChainId: number
  senderAddress: string
  recipientAddress: string
  affiliateFeePercent: string | undefined
  affiliateFeeRecipient: string | undefined
}

export const getDebridgeTradeContext = async ({
  input,
  deps,
  senderAddress,
  recipientAddress,
}: {
  input: DebridgeTradeQuoteInput | DebridgeTradeRateInput
  deps: SwapperDeps
  senderAddress: string
  recipientAddress: string
}): Promise<Result<DebridgeTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellDebridgeChainId, buyDebridgeChainId } = assertion.unwrap()

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
        `[getDebridgeTradeContext] Failed to get treasury address for chainId ${sellAsset.chainId}, affiliate fee will not be applied`,
        e,
      )
    }
  })()

  const fetchArgs: FetchQuoteArgs = {
    input,
    deps,
    sellDebridgeChainId,
    senderAddress,
    recipientAddress,
    affiliateFeePercent,
    affiliateFeeRecipient,
  }

  const maybeQuote =
    sellAsset.chainId === buyAsset.chainId
      ? await fetchSameChainQuote(fetchArgs)
      : await fetchCrossChainQuote({ ...fetchArgs, buyDebridgeChainId })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: quote.buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  return Ok({
    tradeCommon: {
      id: quote.id,
      rate,
      swapperName: SwapperName.Debridge,
      affiliateBps,
      slippageTolerancePercentageDecimal: quote.slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      allowanceContract: isEvmChainId(sellAsset.chainId) ? quote.tx.to : '',
      rate,
      buyAmountBeforeFeesCryptoBaseUnit: quote.buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: quote.buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.Debridge,
      estimatedExecutionTimeMs: quote.estimatedExecutionTimeMs,
      swapperMetadata: {
        name: 'debridge',
        isSameChainSwap: quote.isSameChainSwap,
      } satisfies DebridgeMetadata,
    },
    protocolFees: quote.protocolFees,
    stepDataArgs: {
      tx: quote.tx,
      gasLimit: quote.gasLimit,
      fallbackNetworkFeeCryptoBaseUnit: quote.fallbackNetworkFeeCryptoBaseUnit,
      sellAsset,
      from: senderAddress,
      deps,
    },
  })
}

const fetchCrossChainQuote = async ({
  input,
  deps,
  sellDebridgeChainId,
  buyDebridgeChainId,
  senderAddress,
  recipientAddress,
  affiliateFeePercent,
  affiliateFeeRecipient,
}: FetchQuoteArgs & { buyDebridgeChainId: number }): Promise<
  Result<NormalizedDebridgeQuote, SwapErrorRight>
> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

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
  const fixFee = bnOrZero(quote.fixFee).toFixed()

  const protocolFeeAssetCaipChainId = debridgeChainIdToChainId[sellDebridgeChainId.toString()]
  const protocolFeeAssetIdForFees = protocolFeeAssetCaipChainId
    ? chainIdToFeeAssetId(protocolFeeAssetCaipChainId)
    : undefined

  const protocolFees: QuoteFeeData['protocolFees'] =
    protocolFeeAssetIdForFees && bnOrZero(fixFee).gt(0)
      ? {
          [protocolFeeAssetIdForFees]: {
            amountCryptoBaseUnit: fixFee,
            asset: getBaseAsset(sellAsset.chainId),
            requiresBalance: true,
          },
        }
      : {}

  return Ok({
    id: quote.orderId,
    buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    protocolFees,
    estimatedExecutionTimeMs: quote.order.approximateFulfillmentDelay * 1000,
    isSameChainSwap: false,
    slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
    tx: quote.tx,
    gasLimit: quote.estimatedTransactionFee?.details.gasLimit,
    fallbackNetworkFeeCryptoBaseUnit: quote.estimatedTransactionFee?.total,
  })
}

const fetchSameChainQuote = async ({
  input,
  deps,
  sellDebridgeChainId,
  senderAddress,
  recipientAddress,
  affiliateFeePercent,
  affiliateFeeRecipient,
}: FetchQuoteArgs): Promise<Result<NormalizedDebridgeQuote, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

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
  const protocolFeeAmount = quote.protocolFee ?? '0'

  const buyAmountBeforeFeesCryptoBaseUnit =
    protocolFeeAmount === '0'
      ? buyAmountAfterFeesCryptoBaseUnit
      : BigAmount.fromBaseUnit({
          value: buyAmountAfterFeesCryptoBaseUnit,
          precision: buyAsset.precision,
        })
          .plus(BigAmount.fromBaseUnit({ value: protocolFeeAmount, precision: buyAsset.precision }))
          .toBaseUnit()

  const protocolFees: QuoteFeeData['protocolFees'] =
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
      : {}

  return Ok({
    id: uuid(),
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    protocolFees,
    estimatedExecutionTimeMs: 15_000,
    isSameChainSwap: true,
    slippageTolerancePercentageDecimal:
      input.slippageTolerancePercentageDecimal ??
      (quote.slippage ? bnOrZero(quote.slippage).div(100).toString() : undefined),
    tx: quote.tx,
    gasLimit: quote.estimatedTransactionFee?.details.gasLimit,
    fallbackNetworkFeeCryptoBaseUnit: quote.estimatedTransactionFee?.total,
  })
}

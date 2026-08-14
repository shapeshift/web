import { baseChainId, btcChainId, solanaChainId, tronChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  bnOrZero,
  chainIdToFeeAssetId,
  convertBasisPointsToPercentage,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
  DAO_TREASURY_BASE,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { zeroAddress } from 'viem'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { MixPanelEvent, SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { getTradeAmount, isNativeEvmAsset } from '../../../utils/helpers'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { MAXIMUM_SUPPORTED_RELAY_STEPS, relayErrorCodeToTradeQuoteError } from '../constant'
import { getRelayAssetAddress } from '../utils/getRelayAssetAddress'
import { relayTokenToAsset } from '../utils/relayTokenToAsset'
import { relayTokenToAssetId } from '../utils/relayTokenToAssetId'
import { fetchRelayTrade } from './fetchRelayTrade'
import type { GetRelayStepDataArgs } from './getRelayStepData'
import { assertValidTrade, getRelayAllowanceContract, resolveRelayAddresses } from './helpers'
import type {
  RelayExactOutputTradeQuoteInput,
  RelayExactOutputTradeRateInput,
  RelayQuoteItem,
  RelayTradeQuoteInput,
  RelayTradeRateInput,
} from './types'
import { isRelayError } from './types'

type RelayTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData' | 'allowanceContract'>
  protocolFees: QuoteFeeData['protocolFees']
  relayStepInputs: { data: RelayQuoteItem['data']; allowanceContract: string }[]
  // data/spenderAddress are per-step - the callers pair them from relayStepInputs
  stepDataArgs: Omit<GetRelayStepDataArgs, 'type' | 'input' | 'data' | 'spenderAddress'>
  relayId: string
}

export const getRelayTradeContext = async ({
  input,
  deps,
  relayChainMap,
}: {
  input:
    | RelayTradeQuoteInput
    | RelayTradeRateInput
    | RelayExactOutputTradeQuoteInput
    | RelayExactOutputTradeRateInput
  deps: SwapperDeps
  relayChainMap: typeof relayChainMapImplementation
}): Promise<Result<RelayTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, affiliateBps } = input

  const amount = getTradeAmount(input)
  const isExactOutput = amount.direction === 'exactOut'

  const xpub = 'xpub' in input ? input.xpub : undefined

  const slippageToleranceBps = input.slippageTolerancePercentageDecimal
    ? convertDecimalPercentageToBasisPoints(input.slippageTolerancePercentageDecimal).toFixed()
    : undefined

  const assertion = assertValidTrade({ sellAsset, buyAsset, relayChainMap })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellRelayChainId, buyRelayChainId } = assertion.unwrap()

  const { sendAddress, recipient, refundTo } = resolveRelayAddresses({
    input,
    sellChainId: sellAsset.chainId,
    buyChainId: buyAsset.chainId,
  })

  const maybeQuote = await fetchRelayTrade(
    {
      originChainId: sellRelayChainId,
      originCurrency: getRelayAssetAddress(sellAsset),
      destinationChainId: buyRelayChainId,
      destinationCurrency: getRelayAssetAddress(buyAsset),
      tradeType: isExactOutput ? 'EXACT_OUTPUT' : 'EXACT_INPUT',
      amount: amount.cryptoBaseUnit,
      recipient,
      user: sendAddress,
      refundTo,
      slippageTolerance: slippageToleranceBps,
      refundOnOrigin: true,
      referrer: 'shapeshift',
      appFees: [
        {
          // Relay expects a BASE EVM address for affiliate fees
          recipient: DAO_TREASURY_BASE,
          fee: affiliateBps,
        },
      ],
    },
    deps.config,
  )

  if (maybeQuote.isErr()) {
    const error = maybeQuote.unwrapErr()

    if (!axios.isAxiosError(error.cause)) {
      return Err(
        makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }),
      )
    }

    const relayError = error.cause?.response?.data

    if (!isRelayError(relayError)) {
      return Err(
        makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }),
      )
    }

    const tradeQuoteErrorCode = relayErrorCodeToTradeQuoteError[relayError.errorCode]

    if (tradeQuoteErrorCode) {
      return Err(makeSwapErrorRight({ message: relayError.message, code: tradeQuoteErrorCode }))
    }

    // Fallback for unmapped error codes (shouldn't happen, but prevents crashes)
    return Err(
      makeSwapErrorRight({
        message: relayError.message || 'Unknown Relay error',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const { data: quote } = maybeQuote.unwrap()

  const orderId = quote.protocol?.v2?.orderId
  if (!orderId && sellAsset.chainId === btcChainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay quote missing protocol.v2.orderId',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const { slippageTolerance, currencyIn, currencyOut, timeEstimate } = quote.details

  const sellAmountCryptoBaseUnit = currencyIn.amount

  const buyAmountAfterFeesCryptoBaseUnit = isExactOutput
    ? currencyOut.minimumAmount
    : currencyOut.amount

  if (isExactOutput && !bnOrZero(buyAmountAfterFeesCryptoBaseUnit).eq(amount.cryptoBaseUnit)) {
    return Err(
      makeSwapErrorRight({
        message: `Relay guarantees ${buyAmountAfterFeesCryptoBaseUnit} against a requested exact output of ${amount.cryptoBaseUnit}`,
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const { currency: relayToken } = currencyOut

  const swapSteps = quote.steps.filter(step => step.id !== 'approve')

  if (swapSteps.length >= MAXIMUM_SUPPORTED_RELAY_STEPS) {
    deps.mixPanel?.track(MixPanelEvent.RelayMultiHop)

    return Err(
      makeSwapErrorRight({
        message: `Relay quote with ${swapSteps.length} swap steps not supported (maximum ${MAXIMUM_SUPPORTED_RELAY_STEPS})`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const swapStepsContainsMultipleItems = swapSteps.some(
    step => step.items?.length && step.items.length > 1,
  )

  // It's uncommon but can happen, log it to mixpanel to ensure we will investigate if it happens too much in the future
  if (swapStepsContainsMultipleItems) {
    deps.mixPanel?.track(MixPanelEvent.RelayStepMultipleItems)

    return Err(
      makeSwapErrorRight({
        message: `Relay quote with step containing multiple items not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (swapSteps.some(step => !step.items?.[0])) {
    return Err(makeSwapErrorRight({ message: 'Relay quote step contains no items' }))
  }

  const slippageTolerancePercentageDecimal = (() => {
    if (input.slippageTolerancePercentageDecimal) return input.slippageTolerancePercentageDecimal

    const destinationSlippageTolerancePercentageDecimal = bnOrZero(
      slippageTolerance.destination.percent,
    )

    if (destinationSlippageTolerancePercentageDecimal.gt(0)) {
      return convertBasisPointsToPercentage(destinationSlippageTolerancePercentageDecimal).toFixed()
    }

    const originSlippageTolerancePercentageDecimal = bnOrZero(slippageTolerance.origin.percent)

    return convertBasisPointsToPercentage(originSlippageTolerancePercentageDecimal).toFixed()
  })()

  const protocolAssetId = relayTokenToAssetId(relayToken)

  const maybeProtocolAsset = relayTokenToAsset(relayToken, deps.assetsById)
  if (maybeProtocolAsset.isErr()) return Err(maybeProtocolAsset.unwrapErr())
  const protocolAsset = maybeProtocolAsset.unwrap()

  const isCrossChain = sellAsset.chainId !== buyAsset.chainId

  const maybeAppFeesAsset = (() => {
    // @TODO: when implementing fees, find if solana to solana assets are always showing empty app fees even if
    // affiliate bps are set, if we remove this the quote fetching will fail because relayTokenToAsset will throw
    if (
      sellAsset.chainId === solanaChainId &&
      buyAsset.chainId === solanaChainId &&
      quote.fees.app.currency.address === zeroAddress
    ) {
      return Ok(undefined)
    }

    return relayTokenToAsset(quote.fees.app.currency, deps.assetsById)
  })()

  const isNativeCurrencyInput = (() => {
    if (maybeAppFeesAsset.isErr()) return false
    const appFeesAsset = maybeAppFeesAsset.unwrap()

    if (!appFeesAsset) return false

    if (isEvmChainId(sellAsset.chainId)) {
      return isNativeEvmAsset(sellAsset.assetId) && sellAsset.chainId === appFeesAsset.chainId
    }

    if (sellAsset.chainId === btcChainId) return sellAsset.assetId === appFeesAsset.assetId
    if (sellAsset.chainId === solanaChainId) return sellAsset.assetId === appFeesAsset.assetId
    if (sellAsset.chainId === tronChainId) return sellAsset.assetId === appFeesAsset.assetId

    return false
  })()

  const appFeesBaseUnit = (() => {
    if (maybeAppFeesAsset.isErr()) return '0'
    const appFeesAsset = maybeAppFeesAsset.unwrap()

    if (!appFeesAsset) return '0'

    // For cross-chain: always add back app fees
    // For same-chain: only add back if input is native currency
    if (isCrossChain || isNativeCurrencyInput) {
      if (buyAsset.assetId === appFeesAsset.assetId) {
        return quote.fees.app.amount
      }

      // if fee is in sell asset, convert to buy asset
      if (appFeesAsset.assetId === sellAsset.assetId) {
        return convertPrecision({
          value: quote.fees.app.amount,
          inputExponent: appFeesAsset.precision,
          outputExponent: buyAsset.precision,
        })
          .times(rate)
          .toFixed(0)
      }

      // If fee is in a different asset, convert to buy asset
      const feeAmountUsd = quote.fees.app.amountUsd
      const buyAssetUsd = currencyOut.amountUsd

      if (feeAmountUsd && buyAssetUsd && buyAmountAfterFeesCryptoBaseUnit) {
        // Calculate the rate: (buyAssetAmount / buyAssetUsd) gives us "buy asset per USD"
        // Then multiply by feeAmountUsd to get the equivalent buy asset amount
        const buyAssetCryptoBaseUnitPerUsd = bnOrZero(buyAmountAfterFeesCryptoBaseUnit).div(
          buyAssetUsd,
        )
        const appFeesCryptoBaseUnit = bnOrZero(feeAmountUsd).times(buyAssetCryptoBaseUnitPerUsd)

        return appFeesCryptoBaseUnit.toFixed(0)
      }

      return '0'
    }

    // cross-chain or same-chain with native currency as input are not applicable
    return '0'
  })()

  // If same chain and not sellAsset as native currency, convert to protocol fee as native value is sent as well as erc20 tokens
  // This is a edge case we never encountered before and it's more convenient to consider it as protocol fee as quickwin
  const appFeesAsProtocolFee = (() => {
    if (sellAsset.chainId !== buyAsset.chainId) return {}
    if (maybeAppFeesAsset.isErr()) return {}

    const appFeesAsset = maybeAppFeesAsset.unwrap()

    if (!appFeesAsset || isNativeCurrencyInput) return {}

    return {
      [appFeesAsset.assetId]: {
        amountCryptoBaseUnit: quote.fees.app.amount,
        asset: appFeesAsset,
        requiresBalance: false,
      },
    }
  })()

  const relayerFeeRelayToken = quote.fees.relayer.currency
  const maybeRelayerFeesAsset = relayTokenToAsset(relayerFeeRelayToken, deps.assetsById)

  if (maybeRelayerFeesAsset.isErr()) {
    return Err(maybeRelayerFeesAsset.unwrapErr())
  }

  const relayerFeesAsset = maybeRelayerFeesAsset.unwrap()

  const relayerFeesBuyAssetCryptoBaseUnit = (() => {
    const relayerFeeAmount = quote.fees.relayer.amount

    // If fee is already in buy asset, return as is
    if (relayerFeesAsset.assetId === buyAsset.assetId) {
      return relayerFeeAmount
    }

    // if fee is in sell asset, convert to buy asset
    if (relayerFeesAsset.assetId === sellAsset.assetId) {
      return convertPrecision({
        value: relayerFeeAmount,
        inputExponent: relayerFeesAsset.precision,
        outputExponent: buyAsset.precision,
      })
        .times(rate)
        .toFixed(0)
    }

    // If fee is in a different asset, convert to buy asset
    const feeAmountUsd = quote.fees.relayer.amountUsd
    const buyAssetUsd = currencyOut.amountUsd
    const buyAssetAmountBaseUnit = currencyOut.amount

    if (feeAmountUsd && buyAssetUsd && buyAssetAmountBaseUnit) {
      // Calculate the rate: (buyAssetAmount / buyAssetUsd) gives us "buy asset per USD"
      // Then multiply by feeAmountUsd to get the equivalent buy asset amount
      const buyAssetCryptoBaseUnitPerUsd = bnOrZero(buyAssetAmountBaseUnit).div(buyAssetUsd)
      const buyAssetFeesCryptoBaseUnit = bnOrZero(feeAmountUsd).times(buyAssetCryptoBaseUnitPerUsd)

      return buyAssetFeesCryptoBaseUnit.toFixed(0)
    }

    return '0'
  })()

  // Add back relayer service and gas fees (relayer is including both) since they are downsides,
  // and add appFees — these are quote-level and identical across every step
  const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(buyAmountAfterFeesCryptoBaseUnit)
    .plus(relayerFeesBuyAssetCryptoBaseUnit)
    .plus(appFeesBaseUnit)
    .toFixed()

  const relayId = quote.steps[0].requestId

  const relayStepInputs = swapSteps.map(step => {
    const data = step.items?.[0]?.data
    return { data, allowanceContract: getRelayAllowanceContract(data) }
  })

  return Ok({
    tradeCommon: {
      id: relayId,
      rate,
      swapperName: SwapperName.Relay,
      isExactOutput,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.Relay,
      estimatedExecutionTimeMs: timeEstimate * 1000,
      affiliateFee: buildAffiliateFee({
        strategy: 'fixed_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit,
        buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        fixedAssetId: chainIdToFeeAssetId(baseChainId),
        fixedAsset: deps.assetsById[chainIdToFeeAssetId(baseChainId)],
        isEstimate: true,
      }),
    },
    protocolFees: {
      [protocolAssetId]: {
        amountCryptoBaseUnit: quote.fees.relayer.amount,
        asset: protocolAsset,
        requiresBalance: false,
      },
      ...appFeesAsProtocolFee,
    },
    relayStepInputs,
    stepDataArgs: {
      sellAsset,
      sellAmountCryptoBaseUnit,
      orderId,
      from: sendAddress,
      xpub,
      fallbackNetworkFeeCryptoBaseUnit: quote.fees.gas.amount,
      deps,
    },
    relayId,
  })
}

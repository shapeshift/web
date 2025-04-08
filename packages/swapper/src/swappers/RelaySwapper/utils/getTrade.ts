import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  bnOrZero,
  convertBasisPointsToPercentage,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote, TradeQuoteStep } from '../../../types'
import { MixPanelEvent, SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { relayChainMap as relayChainMapImplementation } from '../constant'
import { DEFAULT_RELAY_EVM_USER_ADDRESS } from '../constant'
import { getRelayEvmAssetAddress } from '../utils/getRelayEvmAssetAddress'
import { relayTokenToAsset } from '../utils/relayTokenToAsset'
import { relayTokenToAssetId } from '../utils/relayTokenToAssetId'
import type { RelayTradeInputParams } from '../utils/types'
import { fetchRelayTrade } from './fetchRelayTrade'

export async function getTrade<T extends 'quote' | 'rate'>({
  input,
  deps,
  relayChainMap,
}: {
  input: RelayTradeInputParams<T>
  deps: SwapperDeps
  relayChainMap: typeof relayChainMapImplementation
}): Promise<Result<TradeQuote[], SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    accountNumber,
    affiliateBps,
    potentialAffiliateBps,
    slippageTolerancePercentageDecimal: _slippageTolerancePercentageDecimal,
  } = input

  const slippageToleranceBps = _slippageTolerancePercentageDecimal
    ? convertDecimalPercentageToBasisPoints(_slippageTolerancePercentageDecimal).toFixed()
    : undefined

  const sellRelayChainId = relayChainMap[sellAsset.chainId]
  const buyRelayChainId = relayChainMap[buyAsset.chainId]

  // @TODO: remove this once we have support for non-EVM chains
  if (!isEvmChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  // @TODO: remove this once we have support for non-EVM chains
  if (!isEvmChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (sellRelayChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (buyRelayChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const sendAddress = (() => {
    if (input.quoteOrRate === 'rate') {
      if (input.sendAddress) return input.sendAddress

      // @TODO: Support solana and BTC addresses according to relay implementation when
      // wallet is not connected
      return DEFAULT_RELAY_EVM_USER_ADDRESS
    }

    return input.sendAddress
  })()

  const recipient = (() => {
    if (input.quoteOrRate === 'rate') {
      if (input.receiveAddress) return input.receiveAddress

      // @TODO: Support solana and BTC addresses according to relay implementation when
      // wallet is not connected
      return DEFAULT_RELAY_EVM_USER_ADDRESS
    }

    return input.receiveAddress
  })()

  const maybeQuote = await fetchRelayTrade(
    {
      originChainId: sellRelayChainId,
      originCurrency: getRelayEvmAssetAddress(sellAsset),
      destinationChainId: buyRelayChainId,
      destinationCurrency: getRelayEvmAssetAddress(buyAsset),
      tradeType: 'EXACT_INPUT',
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      recipient,
      user: sendAddress,
      slippageTolerance: slippageToleranceBps,
      refundOnOrigin: true,
    },
    deps.config,
  )

  // @TODO: handle errors properly and bubble them up to view layer so we can display the error to users
  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

  const { data: quote } = maybeQuote.unwrap()

  const { slippageTolerance, rate, currencyOut, timeEstimate } = quote.details

  const { currency: relayToken } = currencyOut

  const swapSteps = quote.steps.filter(step => step.id !== 'approve')

  if (swapSteps.length >= 2) {
    deps.mixPanel?.track(MixPanelEvent.RelayMultiHop)

    return Err(
      makeSwapErrorRight({
        message: `Relay quote with ${swapSteps.length} swap steps not supported (maximum 2)`,
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

  const slippageTolerancePercentageDecimal = (() => {
    if (_slippageTolerancePercentageDecimal) return _slippageTolerancePercentageDecimal
    const destinationSlippageTolerancePercentageDecimal = bnOrZero(
      slippageTolerance.destination.percent,
    )

    if (destinationSlippageTolerancePercentageDecimal.gt(0)) {
      return convertBasisPointsToPercentage(destinationSlippageTolerancePercentageDecimal).toFixed()
    }

    const originSlippageTolerancePercentageDecimal = bnOrZero(slippageTolerance.origin.percent)

    if (originSlippageTolerancePercentageDecimal.gt(0)) {
      return convertBasisPointsToPercentage(originSlippageTolerancePercentageDecimal).toFixed()
    }
  })()

  const protocolAssetId = relayTokenToAssetId(relayToken)

  const maybeProtocolAsset = relayTokenToAsset(relayToken, deps.assetsById)

  if (maybeProtocolAsset.isErr()) {
    return Err(maybeProtocolAsset.unwrapErr())
  }

  const protocolAsset = maybeProtocolAsset.unwrap()

  const isCrossChain = sellAsset.chainId !== buyAsset.chainId

  const maybeAppFeesAsset = relayTokenToAsset(quote.fees.app.currency, deps.assetsById)

  if (maybeAppFeesAsset.isErr()) {
    return Err(maybeAppFeesAsset.unwrapErr())
  }

  const appFeesAsset = maybeAppFeesAsset.unwrap()

  const appFeesBaseUnit = (() => {
    // @TODO: we might need to change this logic when solana and BTC are supported
    const isNativeCurrencyInput =
      isNativeEvmAsset(sellAsset.assetId) && sellAsset.chainId === appFeesAsset.chainId

    // For cross-chain: always add back app fees
    // For same-chain: only add back if input is native currency
    if (isCrossChain || isNativeCurrencyInput) {
      return quote.fees.app.amount
    }

    // cross-chain or same-chain with native currency as input are not applicable
    return '0'
  })()

  const relayerFeeRelayToken = quote.fees.relayer.currency
  const maybeRelayerFeesAsset = relayTokenToAsset(relayerFeeRelayToken, deps.assetsById)

  if (maybeRelayerFeesAsset.isErr()) {
    return Err(maybeRelayerFeesAsset.unwrapErr())
  }

  const relayerFeesAsset = maybeRelayerFeesAsset.unwrap()

  const relayerFeesBuyAssetBaseUnit = (() => {
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
    const buyAssetAmountBaseUnit = currencyOut.minimumAmount

    if (feeAmountUsd && buyAssetUsd && buyAssetAmountBaseUnit) {
      // Calculate the rate: (buyAssetAmount / buyAssetUsd) gives us "buy asset per USD"
      // Then multiply by feeAmountUsd to get the equivalent buy asset amount
      const buyAssetCryptoBaseUnitPerUsd = bnOrZero(buyAssetAmountBaseUnit).div(buyAssetUsd)
      const buyAssetFeesCryptoBaseUnit = bnOrZero(feeAmountUsd).times(buyAssetCryptoBaseUnitPerUsd)

      return buyAssetFeesCryptoBaseUnit.toFixed(0)
    }

    return '0'
  })()

  const steps = swapSteps.map((quoteStep): TradeQuoteStep => {
    const selectedItem = quoteStep.items?.[0]

    if (!selectedItem) throw new Error('Relay quote step contains no items')

    // Add back relayer service and gas fees (relayer is including both) since they are downsides
    // And add appFees
    const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(currencyOut.minimumAmount)
      .plus(relayerFeesBuyAssetBaseUnit)
      .plus(appFeesBaseUnit)
      .toFixed()

    return {
      allowanceContract: selectedItem.data?.to ?? '',
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: currencyOut.minimumAmount,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      accountNumber,
      feeData: {
        networkFeeCryptoBaseUnit: quote.fees.gas.amount,
        protocolFees: {
          [protocolAssetId]: {
            amountCryptoBaseUnit: quote.fees.relayer.amount,
            asset: protocolAsset,
            requiresBalance: false,
          },
        },
      },
      source: SwapperName.Relay,
      estimatedExecutionTimeMs: timeEstimate * 1000,
      relayTransactionMetadata: {
        to: selectedItem.data?.to,
        value: selectedItem.data?.value,
        data: selectedItem.data?.data,
        // gas is not documented in the relay docs but refers to gasLimit
        gasLimit: selectedItem.data?.gas,
      },
    }
  })

  const tradeQuote: TradeQuote = {
    id: quote.steps[0].requestId ?? '',
    steps: steps as [TradeQuoteStep] | [TradeQuoteStep, TradeQuoteStep],
    receiveAddress: receiveAddress ?? '',
    rate,
    quoteOrRate: 'quote',
    swapperName: SwapperName.Relay,
    affiliateBps,
    potentialAffiliateBps,
    slippageTolerancePercentageDecimal,
  }

  return Ok([tradeQuote])
}

export const getRelayTradeRate = (
  args: RelayTradeInputParams<'rate'>,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
) => {
  return getTrade({
    input: args,
    deps,
    relayChainMap,
  })
}

export const getRelayTradeQuote = (
  args: RelayTradeInputParams<'quote'>,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
) => {
  return getTrade({
    input: args,
    deps,
    relayChainMap,
  })
}

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
import type {
  RelayTradeInputParams,
  RelayTradeQuoteParams,
  RelayTradeRateParams,
} from '../utils/types'
import { isValidRelayToken } from '../utils/types'
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

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

  const { data: quote } = maybeQuote.unwrap()

  if (!quote.details) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay quote details not found',
      }),
    )
  }

  const { slippageTolerance, rate, currencyOut, timeEstimate } = quote.details

  if (!slippageTolerance) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay quote slippage tolerance not found',
      }),
    )
  }

  if (!rate) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay quote rate not found',
      }),
    )
  }

  if (!currencyOut) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay quote relayToken not found',
      }),
    )
  }

  if (!quote.fees?.gas) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay quote gas fees not found',
      }),
    )
  }

  const { currency: relayToken } = currencyOut

  const swapSteps = quote.steps.filter(step => step.id !== 'approve')
  const hasApprovalStep = quote.steps.find(step => step.id === 'approve')

  if (swapSteps.length >= 2) {
    deps.mixPanel?.track(MixPanelEvent.RelayMultiHop, {
      swapper: SwapperName.Relay,
      method: 'get',
      error: 'Unable to execute Relay multi-hop quote',
    })

    return Err(
      makeSwapErrorRight({
        message: `Relay quote with ${swapSteps.length} swap steps not supported (maximum 2)`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const slippageTolerancePercentageDecimal = (() => {
    if (_slippageTolerancePercentageDecimal) return _slippageTolerancePercentageDecimal
    const destinationSlippageTolerancePercentageDecimal = bnOrZero(
      slippageTolerance?.destination?.percent,
    )

    if (destinationSlippageTolerancePercentageDecimal.gt(0)) {
      return convertBasisPointsToPercentage(destinationSlippageTolerancePercentageDecimal).toFixed()
    }

    const originSlippageTolerancePercentageDecimal = bnOrZero(slippageTolerance?.origin?.percent)

    if (originSlippageTolerancePercentageDecimal.gt(0)) {
      return convertBasisPointsToPercentage(originSlippageTolerancePercentageDecimal).toFixed()
    }
  })()

  if (!relayToken) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay protocol token not found',
      }),
    )
  }

  if (!isValidRelayToken(relayToken)) {
    return Err(
      makeSwapErrorRight({
        message: 'Relay protocol token is not properly typed',
      }),
    )
  }

  const protocolAssetId = relayTokenToAssetId(relayToken)

  const protocolAsset = relayTokenToAsset(relayToken, deps.assetsById)

  const steps = swapSteps.map((quoteStep): TradeQuoteStep => {
    const isCrossChain = sellAsset.chainId !== buyAsset.chainId

    const appFeesBaseUnit = (() => {
      // Handle app fees based on cross-chain status
      if (
        quote.fees?.app?.amount &&
        quote.fees?.app?.currency &&
        isValidRelayToken(quote.fees?.app?.currency)
      ) {
        const appFeesAsset = quote.fees?.app?.currency
          ? relayTokenToAsset(quote.fees.app.currency, deps.assetsById)
          : undefined

        // @TODO: we might need to change this logic when solana and BTC are supported
        const isNativeCurrencyInput =
          isNativeEvmAsset(sellAsset.assetId) && sellAsset.chainId === appFeesAsset?.chainId

        // For cross-chain: always add back app fees
        // For same-chain: only add back if input is native currency
        if (isCrossChain || isNativeCurrencyInput) {
          return quote.fees.app.amount
        }
      }

      // cross-chain or same-chain with native currency as input are not applicable
      return '0'
    })()

    const relayerFeesBaseUnit = (() => {
      const relayerFeeRelayToken = quote.fees?.relayer?.currency
      if (relayerFeeRelayToken && isValidRelayToken(relayerFeeRelayToken)) {
        const relayerFeesAsset = relayTokenToAsset(relayerFeeRelayToken, deps.assetsById)
        const relayerFeeAmount = quote.fees?.relayer?.amount ?? '0'

        // If fee is already in buy asset, return as is
        if (relayerFeesAsset?.assetId === buyAsset.assetId) {
          return relayerFeeAmount
        }

        // if fee is in sell asset, convert to buy asset
        if (relayerFeesAsset?.assetId === sellAsset.assetId) {
          return convertPrecision({
            value: relayerFeeAmount,
            inputExponent: relayerFeesAsset.precision,
            outputExponent: buyAsset.precision,
          })
            .times(rate)
            .toFixed(0)
        }

        // If fee is in a different asset, convert to buy asset
        const feeAmountUsd = quote.fees?.relayer?.amountUsd ?? '0'
        const buyAssetUsd = quote.details?.currencyOut?.amountUsd ?? '0'
        const buyAssetAmount = quote.details?.currencyOut?.amount ?? '1'

        if (feeAmountUsd && buyAssetUsd && buyAssetAmount) {
          // Calculate the rate: (buyAssetAmount / buyAssetUsd) gives us "buy asset per USD"
          // Then multiply by feeAmountUsd to get the equivalent buy asset amount
          const buyAssetCryptoBaseUnitPerUsd = bnOrZero(buyAssetAmount).div(buyAssetUsd)
          const buyAssetFeesCryptoBaseUnit = bnOrZero(feeAmountUsd).times(
            buyAssetCryptoBaseUnitPerUsd,
          )

          // Handle precision differences
          const precisionDiff = convertPrecision({
            value: buyAssetFeesCryptoBaseUnit,
            inputExponent: relayerFeesAsset.precision,
            outputExponent: buyAsset.precision,
          })
          return precisionDiff.toFixed(0)
        }

        return '0'
      }

      return '0'
    })()

    // Add back relayer service and gas fees (relayer is including both) since they are downsides
    // And add appFees
    const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(currencyOut.amount)
      // @blocking: relayer can be ETH or destination token
      .plus(relayerFeesBaseUnit)
      .plus(appFeesBaseUnit)
      .toString()

    return {
      allowanceContract: hasApprovalStep ? swapSteps[0]?.items?.[0]?.data?.to : undefined,
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: currencyOut.amount ?? '0',
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      accountNumber,
      feeData: {
        networkFeeCryptoBaseUnit: quote.fees?.gas?.amount ?? '0',
        protocolFees: {
          [protocolAssetId]: {
            amountCryptoBaseUnit: quote.fees?.relayer?.amount ?? '0',
            asset: protocolAsset,
            requiresBalance: false,
          },
        },
      },
      source: SwapperName.Relay,
      estimatedExecutionTimeMs: (timeEstimate ?? 0) * 1000,
      relayTransactionMetadata: {
        to: quoteStep.items?.[0]?.data?.to,
        value: quoteStep.items?.[0]?.data?.value,
        data: quoteStep.items?.[0]?.data?.data,
        gas: quoteStep.items?.[0]?.data?.gas,
        maxFeePerGas: quoteStep.items?.[0]?.data?.maxFeePerGas,
        maxPriorityFeePerGas: quoteStep.items?.[0]?.data?.maxPriorityFeePerGas,
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
  args: RelayTradeRateParams,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
) => {
  return getTrade<'rate'>({
    input: args,
    deps,
    relayChainMap,
  })
}

export const getRelayTradeQuote = (
  args: RelayTradeQuoteParams,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
) => {
  return getTrade<'quote'>({
    input: args,
    deps,
    relayChainMap,
  })
}

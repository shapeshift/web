import {
  bnOrZero,
  convertBasisPointsToPercentage,
  convertDecimalPercentageToBasisPoints,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote, TradeQuoteStep } from '../../../types'
import { MixPanelEvent, SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { relayChainMap as relayChainMapImplementation } from '../constant'
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
    if (input.quoteOrRate === 'rate') return input.sendAddress ?? ''

    return input.sendAddress
  })()

  const maybeQuote = await fetchRelayTrade(
    {
      originChainId: sellRelayChainId,
      originCurrency: getRelayEvmAssetAddress(sellAsset),
      destinationChainId: buyRelayChainId,
      destinationCurrency: getRelayEvmAssetAddress(buyAsset),
      tradeType: 'EXACT_INPUT',
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      recipient: receiveAddress,
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

  const steps = swapSteps.map(
    (quoteStep): TradeQuoteStep => ({
      allowanceContract: hasApprovalStep ? swapSteps[0]?.items?.[0]?.data?.to : undefined,
      rate,
      buyAmountBeforeFeesCryptoBaseUnit: currencyOut.amount ?? '0',
      buyAmountAfterFeesCryptoBaseUnit: currencyOut.amount ?? '0',
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      accountNumber,
      feeData: {
        networkFeeCryptoBaseUnit: quote.fees?.gas?.amount ?? '0',
        protocolFees: {
          [protocolAssetId]: {
            amountCryptoBaseUnit: quote.fees?.relayerService?.amount ?? '0',
            asset: protocolAsset,
            requiresBalance: true,
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
    }),
  )

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

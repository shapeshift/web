import type { Execute } from '@reservoir0x/relay-sdk'
import {
  bnOrZero,
  convertBasisPointsToPercentage,
  convertDecimalPercentageToBasisPoints,
  isSome,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapErrorRight,
  SwapperConfig,
  SwapperDeps,
  TradeQuoteStep,
} from '../../../types'
import { MixPanelEvent, SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
<<<<<<< HEAD
import { getRelayAssetAddress } from '../utils/getRelayAssetAddress'
=======
import type { relayChainMap as relayChainMapImplementation } from '../constant'
import { getRelayEvmAssetAddress } from '../utils/getRelayEvmAssetAddress'
>>>>>>> relay-quotes
import { relayService } from '../utils/relayService'
import type { QuoteParams, RelayTradeQuote, RelayTradeRate } from '../utils/types'

// @TODO: implement affiliate fees
export const getQuote = async (
  params: QuoteParams,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<Execute, any>, SwapErrorRight>> => {
  return await relayService.post<Execute>(`${config.VITE_RELAY_API_URL}/quote`, params)
}

export async function getTrade({
  input,
  deps,
  relayChainMap,
}: {
  input: CommonTradeQuoteInput | GetTradeRateInput
  deps: SwapperDeps
  relayChainMap: typeof relayChainMapImplementation
}): Promise<Result<RelayTradeQuote[] | RelayTradeRate[], SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
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

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'sendAddress is required',
      }),
    )
  }

  const maybeQuote = await getQuote(
    {
      originChainId: sellRelayChainId,
      originCurrency: getRelayAssetAddress(sellAsset),
      destinationChainId: buyRelayChainId,
      destinationCurrency: getRelayAssetAddress(buyAsset),
      tradeType: 'EXACT_INPUT',
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      recipient: receiveAddress,
      user: sendAddress,
      slippageTolerance: slippageToleranceBps,
    },
    deps.config,
  )

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

  const quote = maybeQuote.unwrap()

  const swapSteps = quote.data.steps.filter(step => step.id !== 'approve')
  const hasApprovalStep = quote.data.steps.find(step => step.id === 'approve')

  if (swapSteps.length > 2) {
    deps.mixPanel?.track(MixPanelEvent.RelayMultiSteps, {
      swapper: SwapperName.Relay,
      method: 'get',
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
      quote.data.details?.slippageTolerance?.destination?.percent,
    )

    if (destinationSlippageTolerancePercentageDecimal.gt(0)) {
      return convertBasisPointsToPercentage(destinationSlippageTolerancePercentageDecimal).toFixed()
    }

    const originSlippageTolerancePercentageDecimal = bnOrZero(
      quote.data.details?.slippageTolerance?.origin?.percent,
    )

    if (originSlippageTolerancePercentageDecimal.gt(0)) {
      return convertBasisPointsToPercentage(originSlippageTolerancePercentageDecimal).toFixed()
    }
  })()

  const steps = swapSteps.map(
    (quoteStep): TradeQuoteStep => ({
      allowanceContract: hasApprovalStep ? swapSteps[0]?.items?.[0]?.data?.to : undefined,
      rate: quote.data.details?.rate ?? '0',
      buyAmountBeforeFeesCryptoBaseUnit: quote.data.details?.currencyOut?.amount ?? '0',
      buyAmountAfterFeesCryptoBaseUnit: quote.data.details?.currencyOut?.minimumAmount ?? '0',
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      accountNumber,
      feeData: {
        networkFeeCryptoBaseUnit: bnOrZero(quoteStep.items?.[0]?.data?.gas)
          .times(quoteStep.items?.[0]?.data?.maxFeePerGas)
          .toString(),
        protocolFees: {
          [sellAsset.assetId]: {
            amountCryptoBaseUnit: quote.data.fees?.relayerService?.amount ?? '0',
            asset: sellAsset,
            requiresBalance: true,
          },
        },
      },
      source: SwapperName.Relay,
      estimatedExecutionTimeMs: (quote.data.details?.timeEstimate ?? 0) * 1000,
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

  const tradeQuote: RelayTradeQuote = {
    id: quote.data.steps[0].requestId ?? '',
    steps: steps as [TradeQuoteStep] | [TradeQuoteStep, TradeQuoteStep],
    receiveAddress: receiveAddress ?? '',
    rate: quote.data.details?.rate ?? '0',
    quoteOrRate: 'quote' as const,
    swapperName: SwapperName.Relay,
    affiliateBps,
    potentialAffiliateBps,
    slippageTolerancePercentageDecimal,
  }

  return Ok([tradeQuote])
}

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
  relayChainMap: typeof relayChainMapImplementation,
): Promise<Result<RelayTradeQuote[], SwapErrorRight>> => {
  const quotesResult = await getTrade({ input, deps, relayChainMap })

  return quotesResult.map(quotes =>
    quotes
      .map(quote => {
        if (!quote.receiveAddress) return undefined

        return {
          ...quote,
          quoteOrRate: 'quote' as const,
          receiveAddress: quote.receiveAddress,
          steps: quote.steps.map(step => step) as
            | [TradeQuoteStep]
            | [TradeQuoteStep, TradeQuoteStep],
        }
      })
      .filter(isSome),
  )
}

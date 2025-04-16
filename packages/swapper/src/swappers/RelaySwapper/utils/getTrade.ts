import { btcChainId, solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  bnOrZero,
  convertBasisPointsToPercentage,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import { zeroAddress } from 'viem'

import type {
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteStep,
  TradeRate,
  TradeRateStep,
} from '../../../types'
import { MixPanelEvent, SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { MAXIMUM_SUPPORTED_RELAY_STEPS } from '../constant'
import { getRelayAssetAddress } from '../utils/getRelayAssetAddress'
import { relayTokenToAsset } from '../utils/relayTokenToAsset'
import { relayTokenToAssetId } from '../utils/relayTokenToAssetId'
import type { RelaySolanaInstruction, RelayTradeInputParams } from '../utils/types'
import {
  isRelayQuoteEvmItemData,
  isRelayQuoteSolanaItemData,
  isRelayQuoteUtxoItemData,
} from '../utils/types'
import { fetchRelayTrade } from './fetchRelayTrade'
import { getRelayDefaultUserAddress } from './getRelayDefaultUserAddress'
import { getRelayPsbtRelayer } from './getRelayPsbtRelayer'

export async function getTrade(args: {
  input: RelayTradeInputParams<'quote'>
  deps: SwapperDeps
  relayChainMap: typeof relayChainMapImplementation
}): Promise<Result<TradeQuote[], SwapErrorRight>>

export async function getTrade(args: {
  input: RelayTradeInputParams<'rate'>
  deps: SwapperDeps
  relayChainMap: typeof relayChainMapImplementation
}): Promise<Result<TradeRate[], SwapErrorRight>>

export async function getTrade<T extends 'quote' | 'rate'>({
  input,
  deps,
  relayChainMap,
}: {
  input: RelayTradeInputParams<T>
  deps: SwapperDeps
  relayChainMap: typeof relayChainMapImplementation
}): Promise<Result<TradeQuote[] | TradeRate[], SwapErrorRight>> {
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

  if (
    !isEvmChainId(sellAsset.chainId) &&
    sellAsset.chainId !== btcChainId &&
    sellAsset.chainId !== solanaChainId
  ) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (
    !isEvmChainId(buyAsset.chainId) &&
    buyAsset.chainId !== btcChainId &&
    buyAsset.chainId !== solanaChainId
  ) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
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
    // We absolutely need to use the default user address for BTC swaps
    // or relay quote endpoint will fail at estimation time because we don't necessarily
    // send an address with enough funds but use multiple UTXOs to fund the swap
    if (sellAsset.chainId === btcChainId) {
      return getRelayDefaultUserAddress(sellAsset.chainId)
    }

    if (input.quoteOrRate === 'rate') {
      if (input.sendAddress) return input.sendAddress

      return getRelayDefaultUserAddress(sellAsset.chainId)
    }

    return input.sendAddress
  })()

  const recipient = (() => {
    if (input.quoteOrRate === 'rate') {
      if (input.receiveAddress) return input.receiveAddress

      return getRelayDefaultUserAddress(buyAsset.chainId)
    }

    return input.receiveAddress
  })()

  const refundTo = (() => {
    if (input.quoteOrRate === 'rate') {
      if (input.sendAddress) return input.sendAddress

      return getRelayDefaultUserAddress(sellAsset.chainId)
    }

    if (!input.sendAddress) throw new Error('Send address is required for refund')

    return input.sendAddress
  })()

  const maybeQuote = await fetchRelayTrade(
    {
      originChainId: sellRelayChainId,
      originCurrency: getRelayAssetAddress(sellAsset),
      destinationChainId: buyRelayChainId,
      destinationCurrency: getRelayAssetAddress(buyAsset),
      tradeType: 'EXACT_INPUT',
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      recipient,
      user: sendAddress,
      refundTo,
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

  const convertSolanaInstruction = (
    instruction: RelaySolanaInstruction,
  ): TransactionInstruction => ({
    ...instruction,
    keys: instruction.keys.map(account => ({
      ...account,
      pubkey: new PublicKey(account.pubkey),
    })),
    data: Buffer.from(instruction.data, 'hex'),
    programId: new PublicKey(instruction.programId),
  })

  const isCrossChain = sellAsset.chainId !== buyAsset.chainId

  const appFeesAsset = (() => {
    // @TODO: when implementing fees, find if solana to solana assets are always showing empty app fees even if
    // affiliate bps are set, if we remove this the quote fetching will fail because relayTokenToAsset will throw
    if (
      sellAsset.chainId === solanaChainId &&
      buyAsset.chainId === solanaChainId &&
      quote.fees.app.currency.address === zeroAddress
    ) {
      return
    }
    const maybeAppFeesAsset = relayTokenToAsset(quote.fees.app.currency, deps.assetsById)

    if (maybeAppFeesAsset.isErr()) {
      throw maybeAppFeesAsset.unwrapErr()
    }

    return maybeAppFeesAsset.unwrap()
  })()

  const appFeesBaseUnit = (() => {
    const isNativeCurrencyInput = (() => {
      if (!appFeesAsset) return false

      if (isEvmChainId(sellAsset.chainId)) {
        return isNativeEvmAsset(sellAsset.assetId) && sellAsset.chainId === appFeesAsset.chainId
      }

      if (sellAsset.chainId === btcChainId) {
        return sellAsset.assetId === appFeesAsset.assetId
      }

      if (sellAsset.chainId === solanaChainId) {
        return sellAsset.assetId === appFeesAsset.assetId
      }

      return false
    })()

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

  const steps = swapSteps.map((quoteStep): TradeQuoteStep | TradeRateStep => {
    const selectedItem = quoteStep.items?.[0]

    if (!selectedItem) throw new Error('Relay quote step contains no items')

    // Add back relayer service and gas fees (relayer is including both) since they are downsides
    // And add appFees
    const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(currencyOut.minimumAmount)
      .plus(relayerFeesBuyAssetCryptoBaseUnit)
      .plus(appFeesBaseUnit)
      .toFixed()

    const { allowanceContract, relayTransactionMetadata, solanaTransactionMetadata } = (() => {
      if (!selectedItem.data) throw new Error('Relay quote step contains no data')

      if (isRelayQuoteUtxoItemData(selectedItem.data)) {
        if (!selectedItem.data.psbt) throw new Error('Relay BTC quote step contains no psbt')

        const relayer = getRelayPsbtRelayer(
          selectedItem.data.psbt,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
        )

        return {
          allowanceContract: '',
          relayTransactionMetadata: {
            psbt: selectedItem.data.psbt,
            opReturnData: quoteStep.requestId,
            to: relayer,
          },
          solanaTransactionMetadata: undefined,
        }
      }

      if (isRelayQuoteEvmItemData(selectedItem.data)) {
        return {
          allowanceContract: selectedItem.data?.to ?? '',
          relayTransactionMetadata: {
            to: selectedItem.data?.to,
            value: selectedItem.data?.value,
            data: selectedItem.data?.data,
            // gas is not documented in the relay docs but refers to gasLimit
            gasLimit: selectedItem.data?.gas,
          },
          solanaTransactionMetadata: undefined,
        }
      }

      if (isRelayQuoteSolanaItemData(selectedItem.data)) {
        return {
          allowanceContract: '',
          solanaTransactionMetadata: {
            addressLookupTableAddresses: selectedItem.data?.addressLookupTableAddresses,
            instructions: selectedItem.data?.instructions?.map(convertSolanaInstruction),
          },
          relayTransactionMetadata: undefined,
        }
      }

      throw new Error('Relay quote step contains no data')
    })()

    return {
      allowanceContract,
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
      solanaTransactionMetadata,
      relayTransactionMetadata,
    }
  })

  const baseQuoteOrRate = {
    id: quote.steps[0].requestId,
    rate,
    swapperName: SwapperName.Relay,
    affiliateBps,
    potentialAffiliateBps,
    slippageTolerancePercentageDecimal,
  }

  if (input.quoteOrRate === 'quote') {
    // ts is drunk, this is defined as we are under the quote umbrella but extra safety doesn't hurt
    if (!receiveAddress) {
      return Err(
        makeSwapErrorRight({
          message: 'Receive address is required for quote',
        }),
      )
    }

    const tradeQuote: TradeQuote = {
      ...baseQuoteOrRate,
      steps: steps as [TradeQuoteStep] | [TradeQuoteStep, TradeQuoteStep],
      receiveAddress,
      quoteOrRate: 'quote' as const,
    }

    return Ok([tradeQuote])
  }

  const tradeRate: TradeRate = {
    ...baseQuoteOrRate,
    steps: steps as [TradeRateStep] | [TradeRateStep, TradeRateStep],
    receiveAddress,
    quoteOrRate: 'rate' as const,
  }
  return Ok([tradeRate])
}

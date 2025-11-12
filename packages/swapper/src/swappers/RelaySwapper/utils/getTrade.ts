import { btcChainId, fromChainId, solanaChainId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { UtxoChainId } from '@shapeshiftoss/types'
import {
  bnOrZero,
  convertBasisPointsToPercentage,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
  DAO_TREASURY_BASE,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import axios from 'axios'
import type { Address, Hex } from 'viem'
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
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { chainIdToRelayChainId as relayChainMapImplementation } from '../constant'
import { MAXIMUM_SUPPORTED_RELAY_STEPS, relayErrorCodeToTradeQuoteError } from '../constant'
import { getRelayAssetAddress } from '../utils/getRelayAssetAddress'
import { relayTokenToAsset } from '../utils/relayTokenToAsset'
import { relayTokenToAssetId } from '../utils/relayTokenToAssetId'
import type { RelaySolanaInstruction, RelayTradeInputParams } from '../utils/types'
import {
  isRelayError,
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
    xpub,
  } = input

  const slippageToleranceBps = input.slippageTolerancePercentageDecimal
    ? convertDecimalPercentageToBasisPoints(input.slippageTolerancePercentageDecimal).toFixed()
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
        makeSwapErrorRight({
          message: 'Unknown error',
          code: TradeQuoteError.UnknownError,
        }),
      )
    }

    const relayError = error.cause?.response?.data

    if (!isRelayError(relayError)) {
      return Err(
        makeSwapErrorRight({
          message: 'Unknown error',
          code: TradeQuoteError.UnknownError,
        }),
      )
    }

    const tradeQuoteErrorCode = relayErrorCodeToTradeQuoteError[relayError.errorCode]

    if (tradeQuoteErrorCode) {
      return Err(
        makeSwapErrorRight({
          message: relayError.message,
          code: tradeQuoteErrorCode,
        }),
      )
    }
  }

  const { data: quote } = maybeQuote.unwrap()

  const { slippageTolerance, currencyOut, timeEstimate } = quote.details

  const buyAmountAfterFeesCryptoBaseUnit = currencyOut.amount

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
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

    if (sellAsset.chainId === btcChainId) {
      return sellAsset.assetId === appFeesAsset.assetId
    }

    if (sellAsset.chainId === solanaChainId) {
      return sellAsset.assetId === appFeesAsset.assetId
    }

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

  const networkFeeCryptoBaseUnit = await (async () => {
    if (sellAsset.chainId === btcChainId) {
      const firstStep = swapSteps[0]

      if (!firstStep) throw new Error('Relay quote step contains no items')

      const selectedItem = firstStep.items?.[0]

      if (!selectedItem) throw new Error('Relay quote step contains no items')

      if (!selectedItem.data) throw new Error('Relay quote step contains no data')

      if (!isRelayQuoteUtxoItemData(selectedItem.data))
        throw new Error('Relay BTC quote step contains no psbt')

      if (!selectedItem.data.psbt) throw new Error('Relay BTC quote step contains no psbt')

      const relayer = getRelayPsbtRelayer(
        selectedItem.data.psbt,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
      )

      if (!relayer) throw new Error('Relay BTC quote step contains no relayer')

      const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
        to: relayer,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: {
          pubkey: xpub ?? getRelayDefaultUserAddress(sellAsset.chainId),
          opReturnData: firstStep.requestId,
        },
        sendMax: false,
      }

      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const feeData = await adapter.getFeeData(getFeeDataInput)

      return feeData.fast.txFee
    }

    // Use Tenderly simulation with state overrides for EVM chains
    if (isEvmChainId(sellAsset.chainId)) {
      const firstStep = swapSteps[0]
      const selectedItem = firstStep?.items?.[0]

      if (selectedItem?.data && isRelayQuoteEvmItemData(selectedItem.data)) {
        try {
          const chainIdNumber = Number(fromChainId(sellAsset.chainId).chainReference)

          const tenderlySimulation = await simulateWithStateOverrides(
            {
              chainId: chainIdNumber,
              from: (sendAddress ?? zeroAddress) as Address,
              to: (selectedItem.data.to ?? '') as Address,
              data: (selectedItem.data.data ?? '0x') as Hex,
              value: selectedItem.data.value ?? '0',
              sellAsset,
              sellAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
            },
            {
              apiKey: deps.config.VITE_TENDERLY_API_KEY,
              accountSlug: deps.config.VITE_TENDERLY_ACCOUNT_SLUG,
              projectSlug: deps.config.VITE_TENDERLY_PROJECT_SLUG,
            },
          )

          console.log('[Relay] Tenderly simulation result:', {
            success: tenderlySimulation.success,
            gasUsed: tenderlySimulation.gasUsed.toString(),
            gasLimit: tenderlySimulation.gasLimit.toString(),
            relayGasLimit: selectedItem.data.gas,
            sellAsset: sellAsset.assetId,
            errorMessage: tenderlySimulation.errorMessage,
          })

          if (tenderlySimulation.success) {
            // Use Tenderly's gas estimate instead of Relay's
            const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
            const { fast } = await adapter.getGasFeeData()

            const tenderlyNetworkFee = evm.calcNetworkFeeCryptoBaseUnit({
              ...fast,
              supportsEIP1559: true,
              gasLimit: tenderlySimulation.gasLimit.toString(),
            })

            const relayNetworkFee = quote.fees.gas.amount

            console.log('[Relay] Gas estimate comparison:', {
              tenderlyGasLimit: tenderlySimulation.gasLimit.toString(),
              relayGasLimit: selectedItem.data.gas,
              tenderlyNetworkFee,
              relayNetworkFee,
              difference: bnOrZero(tenderlyNetworkFee).minus(relayNetworkFee).toString(),
              percentDiff:
                bnOrZero(tenderlyNetworkFee)
                  .minus(relayNetworkFee)
                  .div(relayNetworkFee)
                  .times(100)
                  .toFixed(2) + '%',
            })

            return tenderlyNetworkFee
          }
        } catch (error) {
          console.error('[Relay] Tenderly simulation error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            sellAsset: sellAsset.assetId,
          })
        }
      }
    }

    // Fallback to Relay's gas amount
    return quote.fees.gas.amount
  })()

  const steps = swapSteps.map((quoteStep): TradeQuoteStep | TradeRateStep => {
    const selectedItem = quoteStep.items?.[0]

    if (!selectedItem) throw new Error('Relay quote step contains no items')

    // Add back relayer service and gas fees (relayer is including both) since they are downsides
    // And add appFees
    const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(currencyOut.amount)
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
            from: sendAddress,
            psbt: selectedItem.data.psbt,
            opReturnData: quoteStep.requestId,
            to: relayer,
            relayId: quote.steps[0].requestId,
          },
          solanaTransactionMetadata: undefined,
        }
      }

      if (isRelayQuoteEvmItemData(selectedItem.data)) {
        return {
          allowanceContract: selectedItem.data?.to ?? '',
          relayTransactionMetadata: {
            from: sendAddress,
            to: selectedItem.data?.to,
            value: selectedItem.data?.value,
            data: selectedItem.data?.data,
            // gas is not documented in the relay docs but refers to gasLimit
            gasLimit: selectedItem.data?.gas,
            chainId: Number(fromChainId(sellAsset.chainId).chainReference),
            relayId: quote.steps[0].requestId,
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
          relayTransactionMetadata: {
            relayId: quote.steps[0].requestId,
          },
        }
      }

      throw new Error('Relay quote step contains no data')
    })()

    return {
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
        protocolFees: {
          [protocolAssetId]: {
            amountCryptoBaseUnit: quote.fees.relayer.amount,
            asset: protocolAsset,
            requiresBalance: false,
          },
          ...appFeesAsProtocolFee,
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

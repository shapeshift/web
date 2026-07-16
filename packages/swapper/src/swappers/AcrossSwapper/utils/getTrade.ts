import {
  fromAssetId,
  isAssetReference,
  solanaChainId,
  usdcOnSolanaAssetId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  BigAmount,
  bnOrZero,
  chainIdToFeeAssetId,
  convertPrecision,
  isTreasuryChainId,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
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
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../utils/helpers/helpers'
import {
  ACROSS_SOLANA_TOKEN_ADDRESS,
  acrossChainIdToChainId,
  acrossErrorCodeToTradeQuoteError,
  chainIdToAcrossChainId,
  DEFAULT_ACROSS_EVM_TOKEN_ADDRESS,
  DEFAULT_ACROSS_EVM_USER_ADDRESS,
  DEFAULT_ACROSS_SOLANA_USER_ADDRESS,
} from '../constant'
import { fetchAcrossTrade } from './fetchAcrossTrade'
import { getAcrossStepData } from './getAcrossStepData'
import type { AcrossTradeQuoteInput, AcrossTradeRateInput } from './types'
import { isAcrossError } from './types'

const getAcrossAssetAddress = (assetId: string): string => {
  if (isNativeEvmAsset(assetId)) return DEFAULT_ACROSS_EVM_TOKEN_ADDRESS

  const { chainId, assetReference } = fromAssetId(assetId)
  if (chainId === solanaChainId && !isAssetReference(assetReference)) return assetReference
  if (chainId === solanaChainId) return ACROSS_SOLANA_TOKEN_ADDRESS

  return isAssetReference(assetReference) ? zeroAddress : assetReference
}

const getDefaultUserAddress = (chainId: string): string => {
  if (chainId === solanaChainId) return DEFAULT_ACROSS_SOLANA_USER_ADDRESS
  return DEFAULT_ACROSS_EVM_USER_ADDRESS
}

export async function getTrade(args: {
  input: AcrossTradeQuoteInput
  deps: SwapperDeps
}): Promise<Result<TradeQuote[], SwapErrorRight>>

export async function getTrade(args: {
  input: AcrossTradeRateInput
  deps: SwapperDeps
}): Promise<Result<TradeRate[], SwapErrorRight>>

export async function getTrade({
  input,
  deps,
}: {
  input: AcrossTradeQuoteInput | AcrossTradeRateInput
  deps: SwapperDeps
}): Promise<Result<TradeQuote[] | TradeRate[], SwapErrorRight>> {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  if (sellAsset.chainId === buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Across does not support same-chain swaps',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const sellAcrossChainId = chainIdToAcrossChainId[sellAsset.chainId]
  const buyAcrossChainId = chainIdToAcrossChainId[buyAsset.chainId]

  if (sellAcrossChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Sell asset chain '${sellAsset.chainId}' not supported by Across`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (buyAcrossChainId === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `Buy asset chain '${buyAsset.chainId}' not supported by Across`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Across only supports USDC as the bridgeable token on Solana destinations
  if (buyAsset.chainId === solanaChainId && buyAsset.assetId !== usdcOnSolanaAssetId) {
    return Err(
      makeSwapErrorRight({
        message: 'Across only supports USDC as destination token on Solana',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const depositor = input.sendAddress ?? getDefaultUserAddress(sellAsset.chainId)
  const recipient = input.receiveAddress ?? getDefaultUserAddress(buyAsset.chainId)

  const isSolanaRoute = sellAsset.chainId === solanaChainId || buyAsset.chainId === solanaChainId

  const appFee = (() => {
    if (isSolanaRoute) return undefined
    if (!isTreasuryChainId(buyAsset.chainId)) return undefined
    const bps = bnOrZero(affiliateBps)
    if (!bps.isFinite() || bps.lte(0)) return undefined
    return bps.div(10000).toNumber()
  })()

  const appFeeRecipient = (() => {
    if (appFee === undefined) return undefined
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

  const slippage = input.slippageTolerancePercentageDecimal ?? 'auto'

  const integratorId = deps.config.VITE_ACROSS_INTEGRATOR_ID || undefined

  const maybeQuote = await fetchAcrossTrade(
    {
      tradeType: 'exactInput',
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      inputToken: getAcrossAssetAddress(sellAsset.assetId),
      outputToken: getAcrossAssetAddress(buyAsset.assetId),
      originChainId: sellAcrossChainId,
      destinationChainId: buyAcrossChainId,
      depositor,
      recipient,
      appFee,
      appFeeRecipient,
      integratorId,
      slippage,
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

    const acrossError = error.cause?.response?.data

    if (!isAcrossError(acrossError)) {
      return Err(
        makeSwapErrorRight({
          message: 'Unknown error',
          code: TradeQuoteError.UnknownError,
        }),
      )
    }

    const tradeQuoteErrorCode = acrossErrorCodeToTradeQuoteError[acrossError.code]

    return Err(
      makeSwapErrorRight({
        message: acrossError.message,
        code: tradeQuoteErrorCode ?? TradeQuoteError.UnknownError,
      }),
    )
  }

  const { data: quote } = maybeQuote.unwrap()

  const buyAmountAfterFeesCryptoBaseUnit = quote.expectedOutputAmount

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const bridgeFeeAmount = quote.fees.total.amount
  const bridgeFeeAsset = quote.fees.total.token
  const buyAssetAcrossAddress = getAcrossAssetAddress(buyAsset.assetId)
  const isBridgeFeeInBuyAsset =
    bridgeFeeAsset.chainId === buyAcrossChainId &&
    (bridgeFeeAsset.address === buyAssetAcrossAddress ||
      (isEvmChainId(buyAsset.chainId) &&
        bridgeFeeAsset.address.toLowerCase() === buyAssetAcrossAddress.toLowerCase()))

  const buyAmountBeforeFeesCryptoBaseUnit = (() => {
    if (!isBridgeFeeInBuyAsset) return buyAmountAfterFeesCryptoBaseUnit

    const bridgeFeeInBuyAssetPrecision = BigAmount.fromBaseUnit({
      value: convertPrecision({
        value: bridgeFeeAmount,
        inputExponent: bridgeFeeAsset.decimals,
        outputExponent: buyAsset.precision,
      }).toFixed(0),
      precision: buyAsset.precision,
    })

    return BigAmount.fromBaseUnit({
      value: buyAmountAfterFeesCryptoBaseUnit,
      precision: buyAsset.precision,
    })
      .plus(bridgeFeeInBuyAssetPrecision)
      .toBaseUnit()
  })()

  const allowanceContract = isEvmChainId(sellAsset.chainId) ? quote.checks.allowance.spender : ''

  const maybeStepData = await getAcrossStepData({
    swapTx: quote.swapTx,
    sellAsset,
    from: depositor,
    supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
    fallbackNetworkFeeCryptoBaseUnit: quote.fees.originGas.amount,
    assertGetEvmChainAdapter: deps.assertGetEvmChainAdapter,
    assertGetSolanaChainAdapter: deps.assertGetSolanaChainAdapter,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  // Build protocol fee asset ID — Across returns its own numeric chain IDs, convert to CAIP
  const bridgeFeeAssetCaipChainId = acrossChainIdToChainId[bridgeFeeAsset.chainId.toString()]

  const bridgeFeeAssetId = (() => {
    if (!bridgeFeeAssetCaipChainId) return undefined

    const isNativeFeeAsset = (() => {
      if (bridgeFeeAssetCaipChainId === solanaChainId) {
        return (
          bridgeFeeAsset.address === 'So11111111111111111111111111111111111111112' ||
          bridgeFeeAsset.address === zeroAddress
        )
      }
      return bridgeFeeAsset.address === zeroAddress
    })()

    if (isNativeFeeAsset) return chainIdToFeeAssetId(bridgeFeeAssetCaipChainId)

    const tokenStandard = bridgeFeeAssetCaipChainId.startsWith('solana') ? 'token' : 'erc20'
    return `${bridgeFeeAssetCaipChainId}/${tokenStandard}:${bridgeFeeAsset.address}`
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
      protocolFees: bridgeFeeAssetId
        ? {
            [bridgeFeeAssetId]: {
              amountCryptoBaseUnit: bridgeFeeAmount,
              asset: {
                symbol: bridgeFeeAsset.symbol,
                chainId: bridgeFeeAssetCaipChainId,
                precision: bridgeFeeAsset.decimals,
              },
              requiresBalance: false,
            },
          }
        : {},
    },
    source: SwapperName.Across,
    estimatedExecutionTimeMs: quote.expectedFillTime * 1000,
    transactionData,
    affiliateFee:
      appFee !== undefined && appFeeRecipient !== undefined
        ? buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          })
        : undefined,
  }

  const baseQuoteOrRate = {
    id: quote.id,
    rate,
    swapperName: SwapperName.Across,
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
    receiveAddress: recipient,
    quoteOrRate: 'rate' as const,
  }

  return Ok([tradeRate])
}

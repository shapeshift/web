import { solanaChainId } from '@shapeshiftoss/caip'
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
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import { acrossChainIdToChainId, acrossErrorCodeToTradeQuoteError } from '../constant'
import { fetchAcrossTrade } from './fetchAcrossTrade'
import type { GetAcrossStepDataArgs } from './getAcrossStepData'
import { assertValidTrade, getAcrossAssetAddress } from './helpers'
import type { AcrossTradeQuoteInput, AcrossTradeRateInput } from './types'
import { isAcrossError } from './types'

type AcrossTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetAcrossStepDataArgs, 'type' | 'input'>
}

export const getAcrossTradeContext = async ({
  input,
  deps,
  depositor,
  recipient,
}: {
  input: AcrossTradeQuoteInput | AcrossTradeRateInput
  deps: SwapperDeps
  depositor: string
  recipient: string
}): Promise<Result<AcrossTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellAcrossChainId, buyAcrossChainId } = assertion.unwrap()

  const isSolanaRoute = sellAsset.chainId === solanaChainId || buyAsset.chainId === solanaChainId

  const appFee = (() => {
    if (isSolanaRoute) return
    if (!isTreasuryChainId(buyAsset.chainId)) return

    const bps = bnOrZero(affiliateBps)
    if (!bps.isFinite() || bps.lte(0)) return

    return bps.div(10000).toNumber()
  })()

  const appFeeRecipient = (() => {
    if (appFee === undefined) return

    try {
      return getTreasuryAddressFromChainId(buyAsset.chainId).toLowerCase()
    } catch (e) {
      console.error(
        `[getAcrossTradeContext] Failed to get treasury address for chainId ${buyAsset.chainId}, affiliate fee will not be applied`,
        e,
      )
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
        makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }),
      )
    }

    const acrossError = error.cause?.response?.data

    if (!isAcrossError(acrossError)) {
      return Err(
        makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }),
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

  // Build protocol fee asset ID — Across returns its own numeric chain IDs, convert to CAIP
  const bridgeFeeAssetCaipChainId = acrossChainIdToChainId[bridgeFeeAsset.chainId.toString()]

  const bridgeFeeAssetId = (() => {
    if (!bridgeFeeAssetCaipChainId) return

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

  const protocolFees: QuoteFeeData['protocolFees'] = bridgeFeeAssetId
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
    : {}

  return Ok({
    tradeCommon: {
      id: quote.id,
      rate,
      swapperName: SwapperName.Across,
      affiliateBps,
      slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      allowanceContract: isEvmChainId(sellAsset.chainId) ? quote.checks.allowance.spender : '',
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.Across,
      estimatedExecutionTimeMs: quote.expectedFillTime * 1000,
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
    },
    protocolFees,
    stepDataArgs: {
      swapTx: quote.swapTx,
      sellAsset,
      from: depositor,
      fallbackNetworkFeeCryptoBaseUnit: quote.fees.originGas.amount,
      deps,
    },
  })
}

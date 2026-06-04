import { GatewayQuoteV2, instanceOfGatewayQuoteV2OneOf1, instanceOfGatewayQuoteV2OneOf2 } from '@gobob/bob-sdk'
import { btcChainId } from '@shapeshiftoss/caip'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  CommonTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteResult,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import {
  decimalSlippageToBobBps,
  DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE,
  DUMMY_BTC_ADDRESS,
} from '../utils/constants'
import {
  assetIdToBobGatewayToken,
  chainIdToBobGatewayChainName,
  getBobGatewayAffiliates,
  getBobGatewayClient,
  getBobGatewayQuoteMetadata,
  validateBobGatewayRoute,
} from '../utils/helpers/helpers'

const BOB_GATEWAY_ESTIMATED_GAS_LIMIT = 200_000n

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  const result = await _getTradeQuote(input, deps)
  return result.map(quote => [quote])
}

const getEmptyFeeData = (): QuoteFeeData => ({
  networkFeeCryptoBaseUnit: undefined,
  protocolFees: {},
})

const getOptimisticQuoteFeeData = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
  isBtcToEvm: boolean,
): Promise<QuoteFeeData> => {
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  try {
    if (isBtcToEvm) {
      const xpub = (input as GetUtxoTradeQuoteInput).xpub
      if (!xpub) return getEmptyFeeData()

      const { fast } = await deps.assertGetUtxoChainAdapter(sellAsset.chainId).getFeeData({
        to: DUMMY_BTC_ADDRESS,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: { pubkey: xpub },
        sendMax: false,
      })

      return {
        networkFeeCryptoBaseUnit: fast.txFee,
        protocolFees: {},
        chainSpecific: { satsPerByte: fast.chainSpecific.satoshiPerByte },
      }
    }

    const { average } = await deps.assertGetEvmChainAdapter(sellAsset.chainId).getGasFeeData()

    return {
      networkFeeCryptoBaseUnit: (
        BigInt(average.gasPrice ?? '0') * BOB_GATEWAY_ESTIMATED_GAS_LIMIT
      ).toString(),
      protocolFees: {},
    }
  } catch {
    return getEmptyFeeData()
  }
}

const _getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
    receiveAddress,
    accountNumber,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const { config } = deps

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] accountNumber is required for quote',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] sendAddress is required for quote',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] receiveAddress is required for quote',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const routeError = validateBobGatewayRoute(sellAsset.chainId, buyAsset.chainId)
  if (routeError) return Err(routeError)

  const sellChainName = chainIdToBobGatewayChainName(sellAsset.chainId)
  const buyChainName = chainIdToBobGatewayChainName(buyAsset.chainId)

  if (!sellChainName || !buyChainName) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] unsupported chain after route validation',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const isBtcToEvm = sellAsset.chainId === btcChainId

  const slippage = decimalSlippageToBobBps(
    slippageTolerancePercentageDecimal ?? DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE,
  )

  let quoteResponseResult: GatewayQuoteV2;
  try {
    quoteResponseResult = await getBobGatewayClient(config).getQuote({
      fromChain: sellChainName,
      toChain: buyChainName,
      fromToken: assetIdToBobGatewayToken(sellAsset.assetId),
      toToken: assetIdToBobGatewayToken(buyAsset.assetId),
      fromUserAddress: sendAddress,
      toUserAddress: receiveAddress,
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      maxSlippage: Number(slippage),
      affiliates: getBobGatewayAffiliates(config),
    });
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to fetch quote',
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }

  const { outputAmount, estimatedExecutionTimeMs } = getBobGatewayQuoteMetadata(quoteResponseResult)
  const feeData = await getOptimisticQuoteFeeData(input, deps, isBtcToEvm)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: outputAmount,
    sellAsset,
    buyAsset,
  })

  const allowanceContract =
    !isBtcToEvm && contractAddressOrUndefined(sellAsset.assetId)
      ? instanceOfGatewayQuoteV2OneOf1(quoteResponseResult)
        ? quoteResponseResult.offramp.txTo
        : instanceOfGatewayQuoteV2OneOf2(quoteResponseResult)
          ? quoteResponseResult.tokenSwap.txTo
          : ''
      : ''

  const tradeQuote: TradeQuote = {
    id: uuid(),
    quoteOrRate: 'quote',
    rate,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    swapperName: SwapperName.BobGateway,
    steps: [
      {
        buyAmountBeforeFeesCryptoBaseUnit: outputAmount,
        buyAmountAfterFeesCryptoBaseUnit: outputAmount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        feeData,
        rate,
        source: SwapperName.BobGateway,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract,
        estimatedExecutionTimeMs,
        bobSpecific: { gatewayQuote: quoteResponseResult },
      },
    ],
  }

  return Ok(tradeQuote)
}

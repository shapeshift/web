import {
  Configuration,
  instanceOfGatewayQuoteOneOf,
  instanceOfGatewayQuoteOneOf1,
  V1Api,
} from '@gobob/bob-sdk'
import { btcChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  GetTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
  TradeRateResult,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import {
  BOB_GATEWAY_BASE_URL,
  decimalSlippageToBobBps,
  DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE,
  DUMMY_BTC_ADDRESS,
  DUMMY_EVM_ADDRESS,
} from '../utils/constants'
import {
  assetIdToBobGatewayToken,
  chainIdToBobGatewayChainName,
  validateBobGatewayRoute,
} from '../utils/helpers/helpers'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<TradeRateResult> => {
  const result = await _getTradeRate(input, deps)
  return result.map(rate => [rate])
}

const _getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const { config } = deps

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

  const slippage = decimalSlippageToBobBps(
    slippageTolerancePercentageDecimal ?? DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE,
  )

  // For rates (no wallet connected), use dummy addresses.
  // recipient is required by the API; sender is optional.
  const isBtcToEvm = sellAsset.chainId === btcChainId
  const recipient = isBtcToEvm
    ? receiveAddress ?? DUMMY_EVM_ADDRESS
    : receiveAddress ?? DUMMY_BTC_ADDRESS
  const sender = isBtcToEvm ? DUMMY_BTC_ADDRESS : DUMMY_EVM_ADDRESS

  const api = new V1Api(new Configuration({ basePath: BOB_GATEWAY_BASE_URL }))

  let quoteResponse
  try {
    quoteResponse = await api.getQuote({
      srcChain: sellChainName,
      dstChain: buyChainName,
      srcToken: assetIdToBobGatewayToken(sellAsset.assetId),
      dstToken: assetIdToBobGatewayToken(buyAsset.assetId),
      recipient,
      sender,
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippage,
      affiliateId: config.VITE_BOB_GATEWAY_AFFILIATE_ID || undefined,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to fetch rate',
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }

  // Unwrap the discriminated union to get outputAmount.
  // outputAmount is GatewayTokenAmount ({ address, amount, chain }), not a plain string.
  // BOB Gateway docs refer to these as "onramp"/"offramp" — we call them btcToEvm/evmToBtc.
  let outputAmount: string
  if (instanceOfGatewayQuoteOneOf(quoteResponse)) {
    // btcToEvm (BOB calls this "onramp")
    outputAmount = quoteResponse.onramp.outputAmount.amount
  } else if (instanceOfGatewayQuoteOneOf1(quoteResponse)) {
    // evmToBtc (BOB calls this "offramp")
    outputAmount = quoteResponse.offramp.outputAmount.amount
  } else {
    // layerZero quote — not handled in PR 1 (SS-5639)
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] LayerZero routes not yet supported',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: outputAmount,
    sellAsset,
    buyAsset,
  })

  const tradeRate: TradeRate = {
    id: uuid(),
    quoteOrRate: 'rate',
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
        feeData: {
          // Network fee is unknown at rate time (no deposit address yet).
          // Precise fees are calculated in getTradeQuote after createOrder.
          networkFeeCryptoBaseUnit: undefined,
          protocolFees: {},
        },
        rate,
        source: SwapperName.BobGateway,
        buyAsset,
        sellAsset,
        accountNumber: undefined,
        allowanceContract: '',
        estimatedExecutionTimeMs: undefined,
      },
    ],
  }

  return Ok(tradeRate)
}

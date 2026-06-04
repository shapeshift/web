import type { GatewayQuoteV2 } from '@gobob/bob-sdk'
import { btcChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
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
  chainIdToBobGatewayChainName,
  decimalSlippageToBobBps,
  DUMMY_BTC_ADDRESS,
  DUMMY_EVM_ADDRESS,
} from '../utils/constants'
import {
  assetIdToBobGatewayToken,
  getBobGatewayAffiliates,
  getBobGatewayClient,
  getBobGatewayQuoteMetadata,
  validateBobGatewayRoute,
} from '../utils/helpers'

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

  const sellChainName = chainIdToBobGatewayChainName[sellAsset.chainId]
  const buyChainName = chainIdToBobGatewayChainName[buyAsset.chainId]

  if (!sellChainName || !buyChainName) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] unsupported chain after route validation',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const slippage = decimalSlippageToBobBps(
    slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.BobGateway),
  )

  const recipient =
    receiveAddress ?? (buyAsset.chainId === btcChainId ? DUMMY_BTC_ADDRESS : DUMMY_EVM_ADDRESS)
  const sender = sellAsset.chainId === btcChainId ? DUMMY_BTC_ADDRESS : DUMMY_EVM_ADDRESS

  let quoteResponseResult: GatewayQuoteV2
  try {
    quoteResponseResult = await getBobGatewayClient(config).getQuote({
      fromChain: sellChainName,
      toChain: buyChainName,
      fromToken: assetIdToBobGatewayToken(sellAsset.assetId),
      toToken: assetIdToBobGatewayToken(buyAsset.assetId),
      fromUserAddress: sender,
      toUserAddress: recipient,
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      maxSlippage: Number(slippage),
      affiliates: getBobGatewayAffiliates(affiliateBps),
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

  const { outputAmount, estimatedExecutionTimeMs } = getBobGatewayQuoteMetadata(quoteResponseResult)

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
          networkFeeCryptoBaseUnit: undefined,
          protocolFees: {},
        },
        rate,
        source: SwapperName.BobGateway,
        buyAsset,
        sellAsset,
        accountNumber: undefined,
        allowanceContract: '',
        estimatedExecutionTimeMs,
      },
    ],
  }

  return Ok(tradeRate)
}

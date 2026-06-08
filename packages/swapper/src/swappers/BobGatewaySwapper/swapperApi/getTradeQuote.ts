import type { GatewayQuoteV2 } from '@gobob/bob-sdk'
import { btcChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
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
import { decimalSlippageToBobBps, DUMMY_BTC_ADDRESS } from '../utils/constants'
import {
  assertValidTrade,
  assetIdToBobGatewayToken,
  getBobGatewayAffiliates,
  getBobGatewayAllowanceContract,
  getBobGatewayClient,
  parseBobGatewayQuote,
} from '../utils/helpers'

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

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellChainName, buyChainName } = assertion.unwrap()

  const isBtcToEvm = sellAsset.chainId === btcChainId

  const slippage = decimalSlippageToBobBps(
    slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.BobGateway),
  )

  let quoteResponseResult: GatewayQuoteV2
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
      affiliates: getBobGatewayAffiliates(affiliateBps),
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to fetch quote',
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }

  const {
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    protocolFees,
    estimatedExecutionTimeMs,
  } = parseBobGatewayQuote(quoteResponseResult, buyAsset, deps.assetsById)
  const feeData = await getOptimisticQuoteFeeData(input, deps, isBtcToEvm)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const allowanceContract = getBobGatewayAllowanceContract(quoteResponseResult, sellAsset)

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
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        feeData: { ...feeData, protocolFees },
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

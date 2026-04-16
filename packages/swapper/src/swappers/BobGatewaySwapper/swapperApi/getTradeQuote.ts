import {
  Configuration,
  instanceOfGatewayCreateOrderOneOf,
  instanceOfGatewayCreateOrderOneOf1,
  instanceOfGatewayQuoteOneOf,
  instanceOfGatewayQuoteOneOf1,
  V1Api,
} from '@gobob/bob-sdk'
import { btcChainId } from '@shapeshiftoss/caip'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  CommonTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteResult,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import {
  BOB_GATEWAY_BASE_URL,
  decimalSlippageToBobBps,
  DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE,
} from '../utils/constants'
import {
  assetIdToBobGatewayToken,
  chainIdToBobGatewayChainName,
  validateBobGatewayRoute,
} from '../utils/helpers/helpers'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  const result = await _getTradeQuote(input, deps)
  return result.map(quote => [quote])
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

  const api = new V1Api(new Configuration({ basePath: BOB_GATEWAY_BASE_URL }))

  // Step 1: Get quote
  let quoteResponse
  try {
    quoteResponse = await api.getQuote({
      srcChain: sellChainName,
      dstChain: buyChainName,
      srcToken: assetIdToBobGatewayToken(sellAsset.assetId),
      dstToken: assetIdToBobGatewayToken(buyAsset.assetId),
      recipient: receiveAddress,
      sender: sendAddress,
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippage,
      affiliateId: config.VITE_BOB_GATEWAY_AFFILIATE_ID || undefined,
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

  // Validate we got a supported quote type (not LayerZero, which is SS-5639)
  if (!instanceOfGatewayQuoteOneOf(quoteResponse) && !instanceOfGatewayQuoteOneOf1(quoteResponse)) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] LayerZero routes not yet supported',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  // outputAmount is GatewayTokenAmount ({ address, amount, chain }), not a plain string
  // BOB Gateway docs refer to this as "onramp"/"offramp" — we call it btcToEvm/evmToBtc
  const outputAmount = instanceOfGatewayQuoteOneOf(quoteResponse)
    ? quoteResponse.onramp.outputAmount.amount
    : quoteResponse.offramp.outputAmount.amount

  // Step 2: Create order to reserve liquidity and get deposit address / EVM tx data
  let orderResponse
  try {
    orderResponse = await api.createOrder({ gatewayQuote: quoteResponse })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] failed to create order',
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }

  // Extract order metadata based on direction
  let bobSpecific: TradeQuote['steps'][0]['bobSpecific']

  if (instanceOfGatewayCreateOrderOneOf(orderResponse)) {
    // btcToEvm: user sends BTC to deposit address
    const { onramp } = orderResponse
    bobSpecific = {
      orderId: onramp.orderId,
      depositAddress: onramp.address,
    }
  } else if (instanceOfGatewayCreateOrderOneOf1(orderResponse)) {
    // evmToBtc: user executes EVM transaction
    const { offramp } = orderResponse
    bobSpecific = {
      orderId: offramp.orderId,
      evmTx: {
        to: offramp.tx.to,
        data: offramp.tx.data,
        value: offramp.tx.value,
        chain: offramp.tx.chain,
      },
    }
  } else {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] unexpected order response type',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  // Step 3: Estimate network fees
  let networkFeeCryptoBaseUnit: string | undefined

  if (isBtcToEvm) {
    // BTC → BOB: estimate UTXO fee to send to depositAddress
    const utxoAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
    try {
      const { fast } = await utxoAdapter.getFeeData({
        to: bobSpecific.depositAddress ?? '',
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: { pubkey: sendAddress },
        sendMax: false,
      })
      networkFeeCryptoBaseUnit = fast.txFee
    } catch {
      networkFeeCryptoBaseUnit = undefined
    }
  } else {
    // BOB → BTC: estimate EVM gas to execute offramp transaction
    const evmAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
    try {
      const { average } = await evmAdapter.getGasFeeData()
      // Use 200k gas as a conservative estimate for gateway contracts
      networkFeeCryptoBaseUnit = BigInt(average.gasPrice ?? '0') * 200_000n + ''
    } catch {
      networkFeeCryptoBaseUnit = undefined
    }
  }

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: outputAmount,
    sellAsset,
    buyAsset,
  })

  // allowanceContract: for EVM→BTC ERC-20 sells, the user must approve the gateway contract (txTo)
  const allowanceContract =
    !isBtcToEvm && contractAddressOrUndefined(sellAsset.assetId) ? bobSpecific.evmTx?.to ?? '' : ''

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
        feeData: {
          networkFeeCryptoBaseUnit,
          protocolFees: {},
        },
        rate,
        source: SwapperName.BobGateway,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract,
        estimatedExecutionTimeMs: undefined,
        bobSpecific,
      },
    ],
  }

  return Ok(tradeQuote)
}

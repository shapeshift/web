import { btcChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import { DUMMY_BTC_ADDRESS, DUMMY_EVM_ADDRESS } from '../utils/constants'
import {
  assertValidTrade,
  getBobGatewayAllowanceContract,
  getBobGatewayQuote,
  getBobGatewayRateNetworkFeeCryptoBaseUnit,
  parseBobGatewayQuote,
} from '../utils/helpers'

export const getBobGatewayTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    accountNumber,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const { config } = deps

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const { sellChainName, buyChainName } = assertion.unwrap()

  const recipient =
    receiveAddress ?? (buyAsset.chainId === btcChainId ? DUMMY_BTC_ADDRESS : DUMMY_EVM_ADDRESS)
  const sender = sellAsset.chainId === btcChainId ? undefined : DUMMY_EVM_ADDRESS

  const maybeQuote = await getBobGatewayQuote({
    config,
    sellAsset,
    buyAsset,
    sellChainName,
    buyChainName,
    sender,
    recipient,
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const {
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    protocolFees,
    estimatedExecutionTimeMs,
  } = parseBobGatewayQuote(quote, buyAsset, deps.assetsById)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const allowanceContract = getBobGatewayAllowanceContract(quote, sellAsset)

  const networkFeeCryptoBaseUnit = await getBobGatewayRateNetworkFeeCryptoBaseUnit(
    quote,
    sellAsset,
    deps,
  )

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
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        feeData: {
          networkFeeCryptoBaseUnit,
          protocolFees,
        },
        rate,
        source: SwapperName.BobGateway,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract,
        estimatedExecutionTimeMs,
      },
    ],
  }

  return Ok(tradeRate)
}

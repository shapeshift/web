import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { calcNetworkFeeCryptoBaseUnit } from 'lib/utils/evm'
import { convertBasisPointsToPercentage } from 'state/slices/tradeQuoteSlice/utils'

import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { DEFAULT_SOURCE } from '../utils/constants'
import { assertValidTrade, getAdapter, getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchQuoteApiInput, OneInchQuoteResponse } from '../utils/types'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<EvmChainId>, SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    supportsEIP1559,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input
  const apiUrl = getConfig().REACT_APP_ONE_INCH_API_URL

  const assertion = assertValidTrade({ buyAsset, sellAsset, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyTokenPercentageFee = convertBasisPointsToPercentage(affiliateBps).toNumber()

  const params: OneInchQuoteApiInput = {
    fromTokenAddress: fromAssetId(sellAsset.assetId).assetReference,
    toTokenAddress: fromAssetId(buyAsset.assetId).assetReference,
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    fee: buyTokenPercentageFee,
  }

  const { chainReference } = fromChainId(chainId)
  const maybeQuoteResponse = await oneInchService.get<OneInchQuoteResponse>(
    `${apiUrl}/${chainReference}/quote`,
    { params },
  )

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const { data: quote } = maybeQuoteResponse.unwrap()

  const rate = getRate(quote).toString()

  const maybeAllowanceContract = await getApprovalAddress(apiUrl, chainId)
  if (maybeAllowanceContract.isErr()) return Err(maybeAllowanceContract.unwrapErr())
  const allowanceContract = maybeAllowanceContract.unwrap()

  const maybeAdapter = getAdapter(chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  try {
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      gasLimit: quote.estimatedGas,
      l1GasLimit: '0', // TODO: support l1 gas limit for accurate optimism estimations
    })

    return Ok({
      rate,
      steps: [
        {
          allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: quote.toTokenAmount,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit,
          },
          sources: DEFAULT_SOURCE,
        },
      ],
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: tradeQuote] - failed to get fee data',
        cause: err,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}

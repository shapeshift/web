import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import { bn } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/types'
import { SwapErrorType, SwapperName } from 'lib/swapper/types'
import { makeSwapErrorRight } from 'lib/swapper/utils'
import { calcNetworkFeeCryptoBaseUnit } from 'lib/utils/evm'
import {
  addBasisPointAmount,
  convertBasisPointsToPercentage,
} from 'state/slices/tradeQuoteSlice/utils'

import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { assertValidTrade, getAdapter, getOneInchTokenAddress, getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchQuoteApiInput, OneInchQuoteResponse } from '../utils/types'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote, SwapErrorRight>> {
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

  const maybeTreasuryAddress = (() => {
    try {
      return getTreasuryAddressFromChainId(buyAsset.chainId)
    } catch (err) {}
  })()

  const buyTokenPercentageFee = convertBasisPointsToPercentage(affiliateBps).toNumber()

  const params: OneInchQuoteApiInput = {
    src: getOneInchTokenAddress(sellAsset),
    dst: getOneInchTokenAddress(buyAsset),
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    ...(maybeTreasuryAddress && {
      fee: buyTokenPercentageFee,
    }),
    includeTokensInfo: true,
    includeProtocols: true,
    includeGas: true,
  }

  const { chainReference } = fromChainId(chainId)
  const maybeQuoteResponse = await oneInchService.get<OneInchQuoteResponse>(
    `${apiUrl}/${chainReference}/quote`,
    { params },
  )

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())

  const { data: quote } = maybeQuoteResponse.unwrap()
  const { toAmount: buyAmountAfterFeesCryptoBaseUnit } = quote
  const buyAmountBeforeFeesCryptoBaseUnit = addBasisPointAmount(
    buyAmountAfterFeesCryptoBaseUnit,
    affiliateBps,
  )

  const rate = getRate(quote).toString()

  const maybeAllowanceContract = await getApprovalAddress(apiUrl, chainId)
  if (maybeAllowanceContract.isErr()) return Err(maybeAllowanceContract.unwrapErr())
  const allowanceContract = maybeAllowanceContract.unwrap()

  const maybeAdapter = getAdapter(chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  if (!quote.gas) throw new Error('1inch quote missing gas')

  try {
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      gasLimit: bn(quote.gas).toString(),
      l1GasLimit: '0', // TODO: support l1 gas limit for accurate optimism estimations
    })

    return Ok({
      id: uuid(),
      receiveAddress,
      affiliateBps,
      rate,
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit,
          },
          source: SwapperName.OneInch,
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

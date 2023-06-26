import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { calcNetworkFeeCryptoBaseUnit } from 'lib/utils/evm'
import { convertBasisPointsToPercentage } from 'state/zustand/swapperStore/utils'

import { normalizeAmount } from '../../utils/helpers/helpers'
import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { getMinimumCryptoHuman } from '../getMinimumCryptoHuman/getMinimumCryptoHuman'
import { DEFAULT_SOURCE } from '../utils/constants'
import { assertValidTrade, getAdapter, getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from '../utils/types'

export async function getTradeQuote(
  { apiUrl }: OneInchSwapperDeps,
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<EvmChainId>, SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    supportsEIP1559: eip1559Support,
    receiveAddress,
  } = input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTrade({ buyAsset, sellAsset, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const minimumCryptoHuman = getMinimumCryptoHuman()
  const minimumCryptoBaseUnit = toBaseUnit(minimumCryptoHuman, sellAsset.precision)

  const normalizedSellAmountCryptoBaseUnit = normalizeAmount(
    bnOrZero(sellAmount).eq(0) ? minimumCryptoBaseUnit : sellAmount,
  )

  const buyTokenPercentageFee = convertBasisPointsToPercentage(affiliateBps).toNumber()

  const params: OneInchQuoteApiInput = {
    fromTokenAddress: fromAssetId(sellAsset.assetId).assetReference,
    toTokenAddress: fromAssetId(buyAsset.assetId).assetReference,
    amount: normalizedSellAmountCryptoBaseUnit,
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
      supportsEIP1559: eip1559Support,
      gasLimit: quote.estimatedGas,
      l1GasLimit: '0', // TODO: support l1 gas limit for accurate optimism estimations
    })

    // don't show buy amount if less than min sell amount
    const isSellAmountBelowMinimum = bnOrZero(normalizedSellAmountCryptoBaseUnit).lt(
      minimumCryptoBaseUnit,
    )
    const buyAmountCryptoBaseUnit = isSellAmountBelowMinimum ? '0' : quote.toTokenAmount

    return Ok({
      minimumCryptoHuman,
      steps: [
        {
          allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountBeforeFeesCryptoBaseUnit: normalizedSellAmountCryptoBaseUnit,
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

import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { addBasisPointAmount, convertBasisPointsToPercentage } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInput,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getRate, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { assertValidTrade, getOneInchTokenAddress } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchQuoteApiInput, OneInchQuoteResponse } from '../utils/types'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    potentialAffiliateBps,
    supportsEIP1559,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input
  const apiUrl = deps.config.REACT_APP_ONE_INCH_API_URL

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeTreasuryAddress = (() => {
    try {
      return getTreasuryAddressFromChainId(buyAsset.chainId)
    } catch (err) {}
  })()

  const buyTokenPercentageFee = convertBasisPointsToPercentage(affiliateBps).toNumber()

  const params: OneInchQuoteApiInput = {
    fromTokenAddress: getOneInchTokenAddress(sellAsset),
    toTokenAddress: getOneInchTokenAddress(buyAsset),
    receiver: receiveAddress,
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    ...(maybeTreasuryAddress && {
      fee: buyTokenPercentageFee,
    }),
  }

  const { chainReference } = fromChainId(chainId)
  const maybeQuoteResponse = await oneInchService.get<OneInchQuoteResponse>(
    `${apiUrl}/${chainReference}/quote`,
    { params },
  )

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())

  const { data: quote } = maybeQuoteResponse.unwrap()
  const { toTokenAmount: buyAmountAfterFeesCryptoBaseUnit } = quote
  const buyAmountBeforeFeesCryptoBaseUnit = addBasisPointAmount(
    buyAmountAfterFeesCryptoBaseUnit,
    affiliateBps,
  )

  const rate = getRate({
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit: quote.fromTokenAmount,
    buyAmountCryptoBaseUnit: quote.toTokenAmount,
  })

  const maybeAllowanceContract = await getApprovalAddress(apiUrl, chainId)
  if (maybeAllowanceContract.isErr()) return Err(maybeAllowanceContract.unwrapErr())
  const allowanceContract = maybeAllowanceContract.unwrap()

  try {
    // assert get is allowed because we chain chainId is an EVM chainId above in assertValidTrade
    const adapter = deps.assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      gasLimit: quote.estimatedGas,
      l1GasLimit: '0', // TODO: support l1 gas limit for accurate optimism estimations
    })

    return Ok({
      id: uuid(),
      receiveAddress,
      affiliateBps,
      potentialAffiliateBps,
      rate,
      // slippage is a pass-thru for this swapper because it's actually inputted to 1inch when building the tx
      slippageTolerancePercentageDecimal:
        input.slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.OneInch),
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
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: tradeQuote] - failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}

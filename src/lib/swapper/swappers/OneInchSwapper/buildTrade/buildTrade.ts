import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { DAO_TREASURY_ETHEREUM_MAINNET } from 'constants/treasury'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, GetEvmTradeQuoteInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { getFees } from 'lib/utils/evm'
import { convertBasisPointsToPercentage } from 'state/zustand/swapperStore/utils'

import { DEFAULT_SLIPPAGE, DEFAULT_SOURCE } from '../utils/constants'
import { assertValidTrade, getAdapter, getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type {
  OneInchSwapApiInput,
  OneInchSwapperDeps,
  OneInchSwapResponse,
  OneInchTrade,
} from '../utils/types'

export const buildTrade = async (
  deps: OneInchSwapperDeps,
  input: BuildTradeInput & GetEvmTradeQuoteInput,
): Promise<Result<OneInchTrade<EvmChainId>, SwapErrorRight>> => {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    accountNumber,
    supportsEIP1559,
    slippage,
    receiveAddress,
    affiliateBps,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  /**
   * limit of price slippage you are willing to accept in percentage,
   * may be set with decimals. &slippage=0.5 means 0.5% slippage is acceptable.
   * Low values increase chances that transaction will fail,
   * high values increase chances of front running. Set values in the range from 0 to 50
   */
  const slippagePercentage = (slippage ? bnOrZero(slippage) : bnOrZero(DEFAULT_SLIPPAGE))
    .times(100)
    .toNumber()

  const buyTokenPercentageFee = convertBasisPointsToPercentage(affiliateBps).toNumber()

  const params: OneInchSwapApiInput = {
    fromTokenAddress: fromAssetId(sellAsset.assetId).assetReference,
    toTokenAddress: fromAssetId(buyAsset.assetId).assetReference,
    // HACK: use the receive address as the send address
    // 1inch uses this to check allowance on their side
    // this swapper is not cross-account so this works
    fromAddress: receiveAddress,
    amount: sellAmountBeforeFeesCryptoBaseUnit,
    slippage: slippagePercentage,
    allowPartialFill: false,
    referrerAddress: DAO_TREASURY_ETHEREUM_MAINNET,
    disableEstimate: false,
    fee: buyTokenPercentageFee,
  }

  const { chainReference } = fromChainId(chainId)
  const maybeSwapResponse = await oneInchService.get<OneInchSwapResponse>(
    `${deps.apiUrl}/${chainReference}/swap`,
    { params },
  )

  if (maybeSwapResponse.isErr()) return Err(maybeSwapResponse.unwrapErr())
  const { data: swap } = maybeSwapResponse.unwrap()

  const maybeAdapter = getAdapter(chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  try {
    const { networkFeeCryptoBaseUnit } = await getFees({
      supportsEIP1559,
      from: receiveAddress,
      adapter,
      to: swap.tx.to,
      value: swap.tx.value,
      data: swap.tx.data,
    })

    // Note: 1inch will not return a response to the above API if the needed approval is not in place.
    // this behavior can be disabled by setting `disableEstimate` to true, but the documentation
    // is unclear on what other checks are disabled when that is set to true.
    // I believe this is fine since we shouldn't be building trade transactions if no approval is in place
    // but this may need to be altered after additional testing
    return Ok({
      rate: getRate(swap).toString(),
      feeData: {
        protocolFees: {},
        networkFeeCryptoBaseUnit,
      },
      sellAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      buyAsset,
      buyAmountBeforeFeesCryptoBaseUnit: swap.toTokenAmount,
      accountNumber,
      receiveAddress,
      sources: DEFAULT_SOURCE,
      tx: swap.tx,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: buildTrade] - failed to get fees',
        cause: err,
        code: SwapErrorType.BUILD_TRADE_FAILED,
      }),
    )
  }
}

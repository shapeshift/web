import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { DAO_TREASURY_ETHEREUM_MAINNET } from 'constants/treasury'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { convertBasisPointsToPercentage } from 'state/zustand/swapperStore/utils'

import { DEFAULT_SLIPPAGE, DEFAULT_SOURCE } from '../utils/constants'
import { getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type {
  OneInchSwapApiInput,
  OneInchSwapperDeps,
  OneInchSwapResponse,
  OneInchTrade,
} from '../utils/types'

export const buildTrade = async (
  deps: OneInchSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<OneInchTrade<EvmChainId>, SwapErrorRight>> => {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    accountNumber,
    slippage,
    receiveAddress,
    affiliateBps,
  } = input
  if (sellAsset.chainId !== buyAsset.chainId || sellAsset.chainId !== chainId) {
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade] cross chain swaps not supported',
        code: SwapErrorType.UNSUPPORTED_PAIR,
      }),
    )
  }

  if (
    !isEvmChainId(chainId) ||
    !isEvmChainId(sellAsset.chainId) ||
    !isEvmChainId(buyAsset.chainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade] invalid chainId',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
      }),
    )
  }

  const { assetReference: fromAssetAddress } = fromAssetId(sellAsset.assetId)
  const { assetReference: toAssetAddress } = fromAssetId(buyAsset.assetId)

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

  const swapApiInput: OneInchSwapApiInput = {
    fromTokenAddress: fromAssetAddress,
    toTokenAddress: toAssetAddress,
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
    { params: swapApiInput },
  )

  return maybeSwapResponse.andThen(swapResponse => {
    const fee = bnOrZero(swapResponse.data.tx.gasPrice).times(bnOrZero(swapResponse.data.tx.gas))

    // Note: 1inch will not return a response to the above API if the needed approval is not in place.
    // this behavior can be disabled by setting `disableEstimate` to true, but the documentation
    // is unclear on what other checks are disabled when that is set to true.
    // I believe this is fine since we shouldn't be building trade transactions if no approval is in place
    // but this may need to be altered after additional testing
    const trade: OneInchTrade<EvmChainId> = {
      rate: getRate(swapResponse.data).toString(),
      feeData: {
        protocolFees: {},
        networkFeeCryptoBaseUnit: fee.toString(),
      },
      sellAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      buyAsset,
      buyAmountBeforeFeesCryptoBaseUnit: swapResponse.data.toTokenAmount,
      accountNumber,
      receiveAddress,
      sources: DEFAULT_SOURCE,
      tx: swapResponse.data.tx,
    }

    return Ok(trade)
  })
}

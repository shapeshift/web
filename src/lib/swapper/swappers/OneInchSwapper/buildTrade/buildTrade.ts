import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads/build'
import { Ok } from '@sniptt/monads/build'
import type { AxiosResponse } from 'axios'
import axios from 'axios'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'

import { DEFAULT_SLIPPAGE, DEFAULT_SOURCE, REFERRAL_ADDRESS } from '../utils/constants'
import { getRate } from '../utils/helpers'
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
  try {
    const {
      chainId,
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      accountNumber,
      slippage,
      receiveAddress,
    } = input
    if (sellAsset.chainId !== buyAsset.chainId || sellAsset.chainId !== chainId) {
      throw new SwapError('[buildTrade] cross chain swaps not supported', {
        code: SwapErrorType.UNSUPPORTED_PAIR,
      })
    }

    if (
      !isEvmChainId(chainId) ||
      !isEvmChainId(sellAsset.chainId) ||
      !isEvmChainId(buyAsset.chainId)
    ) {
      throw new SwapError('[buildTrade] invalid chainId', {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
      })
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

    const swapApiInput: OneInchSwapApiInput = {
      fromTokenAddress: fromAssetAddress,
      toTokenAddress: toAssetAddress,
      fromAddress: receiveAddress,
      amount: sellAmountBeforeFeesCryptoBaseUnit,
      slippage: slippagePercentage,
      allowPartialFill: false,
      referrerAddress: REFERRAL_ADDRESS,
      disableEstimate: false,
    }

    const { chainReference } = fromChainId(chainId)
    const swapResponse: AxiosResponse<OneInchSwapResponse> = await axios.get(
      `${deps.apiUrl}/${chainReference}/swap`,
      { params: swapApiInput },
    )
    const fee = bnOrZero(swapResponse.data.tx.gasPrice).times(bnOrZero(swapResponse.data.tx.gas))

    // Note: 1inch will not return a response to the above API if the needed approval is not in place.
    // this behavior can be disabled by setting `disableEstimate` to true, but the documentation
    // is unclear on what other checks are disabled when that is set to true.
    // I believe this is fine since we shouldn't be building trade transactions if no approval is in place
    // but this may need to be altered after additional testing
    const trade: OneInchTrade<EvmChainId> = {
      rate: getRate(swapResponse.data).toString(),
      feeData: {
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
        networkFeeCryptoBaseUnit: fee.toString(),
        chainSpecific: {
          estimatedGasCryptoBaseUnit: swapResponse.data.tx.gas,
          gasPriceCryptoBaseUnit: swapResponse.data.tx.gasPrice,
          approvalFeeCryptoBaseUnit: '0',
        },
      },
      sellAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      buyAsset,
      buyAmountCryptoBaseUnit: swapResponse.data.toTokenAmount,
      accountNumber,
      receiveAddress,
      sources: DEFAULT_SOURCE,
      tx: swapResponse.data.tx,
    }

    return Ok(trade)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[buildTrade]', {
      code: SwapErrorType.BUILD_TRADE_FAILED,
    })
  }
}

import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { BuildTradeInput } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { AxiosResponse } from 'axios'
import axios from 'axios'

import { bnOrZero } from '../../../../lib/bignumber/bignumber'
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
): Promise<OneInchTrade<EvmChainId>> => {
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
    amount: sellAmountBeforeFeesCryptoBaseUnit,
    slippage: slippagePercentage,
    allowPartialFill: false,
    referrerAddress: REFERRAL_ADDRESS,
    // TODO: unsure if we should set gas limits here or let 1inch return their defaults
  }

  const { chainReference } = fromChainId(chainId)
  const swapResponse: AxiosResponse<OneInchSwapResponse> = await axios.get(
    `${deps.apiUrl}/${chainReference}/swap`,
    { params: swapApiInput },
  )

  console.log(swapResponse.data)

  const fee = bnOrZero(swapResponse.data.tx.gasPrice).times(bnOrZero(swapResponse.data.tx.gas))

  const trade: OneInchTrade<EvmChainId> = {
    rate: getRate(swapResponse.data).toString(),
    feeData: {
      buyAssetTradeFeeUsd: '0',
      sellAssetTradeFeeUsd: '0',
      networkFeeCryptoBaseUnit: fee.toString(),
      chainSpecific: {
        estimatedGasCryptoBaseUnit: swapResponse.data.tx.gas,
        gasPriceCryptoBaseUnit: swapResponse.data.tx.gasPrice,
        approvalFeeCryptoBaseUnit: '0', // TODO: add approval fee
      },
    },
    sellAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    buyAsset,
    buyAmountCryptoBaseUnit: swapResponse.data.toTokenAmount,
    accountNumber,
    receiveAddress,
    sources: DEFAULT_SOURCE,
    txData: swapResponse.data.tx.data,
  }

  //TODO: check if approval is needed and add fee!
  return trade
}

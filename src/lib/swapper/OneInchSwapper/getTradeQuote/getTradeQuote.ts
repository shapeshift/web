import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput, QuoteFeeData, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { AxiosResponse } from 'axios'
import axios from 'axios'

import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
import { getMinMax, getRate } from '../utils/helpers'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from '../utils/types'

export async function getTradeQuote(
  deps: OneInchSwapperDeps,
  input: GetEvmTradeQuoteInput,
): Promise<TradeQuote<EvmChainId>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    sendMax,
    receiveAddress,
    accountNumber,
  } = input

  if (sellAsset.chainId !== buyAsset.chainId) {
    throw new SwapError('[getTradeQuote] cross chain swaps not supported', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
    })
  }

  if (
    !isEvmChainId(chainId) ||
    !isEvmChainId(sellAsset.chainId) ||
    !isEvmChainId(buyAsset.chainId)
  ) {
    throw new SwapError('[getTradeQuote] invalid chainId', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
    })
  }

  const { assetReference: fromAssetAddress } = fromAssetId(sellAsset.assetId)
  const { assetReference: toAssetAddress } = fromAssetId(buyAsset.assetId)

  const apiInput: OneInchQuoteApiInput = {
    fromTokenAddress: fromAssetAddress,
    toTokenAddress: toAssetAddress,
    amount: sellAmountBeforeFeesCryptoBaseUnit,
  }
  const { chainReference } = fromChainId(chainId)
  const quoteResponse: AxiosResponse<OneInchQuoteResponse> = await axios.get(
    `${deps.apiUrl}/${chainReference}/quote`,
    { params: apiInput },
  )

  const rate = getRate(quoteResponse.data).toString()
  const allowanceContract = await getApprovalAddress(deps, chainId)
  const minMax = await getMinMax(deps, sellAsset, buyAsset)

  const feeData = {} as QuoteFeeData<EvmChainId> //FIXME
  return {
    rate,
    buyAsset,
    sellAsset,
    accountNumber,
    allowanceContract,
    buyAmountCryptoBaseUnit: quoteResponse.data.toTokenAmount,
    sellAmountBeforeFeesCryptoBaseUnit,
    maximumCryptoHuman: minMax.maximumAmountCryptoHuman,
    minimumCryptoHuman: minMax.minimumAmountCryptoHuman,
    feeData, // FIXME
    sources: [], // FIXME
  }
}

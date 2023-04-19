import { EVMChain } from '@lifi/sdk'
import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { FeeData } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput, QuoteFeeData, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { bnOrZero } from '../../../../lib/bignumber/bignumber'
import type { AxiosError, AxiosResponse } from 'axios'
import axios from 'axios'

import { getApprovalAddress } from '../getApprovalAddress/getApprovalAddress'
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

  //TODO: how does this work for ETH or maybe 1inch only supports weth...
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

  const fromTokenAmountDecimal = bnOrZero(quoteResponse.data.fromTokenAmount).div(
    bnOrZero(10).pow(quoteResponse.data.fromToken.decimals),
  )
  const toTokenAmountDecimal = bnOrZero(quoteResponse.data.toTokenAmount).div(
    bnOrZero(10).pow(quoteResponse.data.toToken.decimals),
  )

  const rate = toTokenAmountDecimal.div(fromTokenAmountDecimal).toString()
  const allowanceContract = await getApprovalAddress(deps, chainId)

  const feeData = {} as QuoteFeeData<EvmChainId> //FIXME

  return {
    rate,
    buyAsset,
    sellAsset,
    accountNumber,
    allowanceContract,
    buyAmountCryptoBaseUnit: quoteResponse.data.toTokenAmount,
    sellAmountBeforeFeesCryptoBaseUnit,
    feeData,
    maximumCryptoHuman: '0', // FIXME
    minimumCryptoHuman: '0', // FIXME
    sources: [], // FIXME
  }
}

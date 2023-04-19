import { EvmChainId } from "@shapeshiftoss/chain-adapters";
import { fromAssetId } from '@shapeshiftoss/caip'
import { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from "../utils/types";
import { GetEvmTradeQuoteInput, SwapError, SwapErrorType, TradeQuote } from "@shapeshiftoss/swapper";
import type { AxiosError, AxiosResponse } from 'axios'
import axios from "axios";


export async function getTradeQuote(deps: OneInchSwapperDeps, input: GetEvmTradeQuoteInput): Promise<TradeQuote<EvmChainId>>{
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
    const { assetReference: fromAssetAddress} = fromAssetId(sellAsset.assetId)
    const { assetReference: toAssetAddress } = fromAssetId(buyAsset.assetId)

    const apiInput : OneInchQuoteApiInput = {
        fromTokenAddress: fromAssetAddress,
        toTokenAddress: toAssetAddress,
        amount: sellAmountBeforeFeesCryptoBaseUnit
    }

    const quoteResponse: AxiosResponse<OneInchQuoteResponse> = await axios.get(`${deps.apiUrl}/${chainId}/quote`, {params: apiInput})
    
    const fromTokenAmountDecimal = bn(quoteResponse.data.fromTokenAmount).div(bn(10).pow(quoteResponse.data.fromToken.decimals))
    const toTokenAmountDecimal =  bn(quoteResponse.data.toTokenAmount).div(bn(10).pow(quoteResponse.data.toToken.decimals))

    const rate = toTokenAmountDecimal.div(fromTokenAmountDecimal).toString() 

    return {
        rate,
        buyAsset,
        sellAsset,
        accountNumber,
    }
}

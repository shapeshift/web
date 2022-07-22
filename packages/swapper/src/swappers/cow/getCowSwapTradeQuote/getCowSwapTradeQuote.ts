import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'

import { GetTradeQuoteInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { getApproveContractData, normalizeIntegerAmount } from '../../utils/helpers/helpers'
import { CowSwapperDeps } from '../CowSwapper'
import { getCowSwapMinMax } from '../getCowSwapMinMax/getCowSwapMinMax'
import { CowSwapQuoteResponse } from '../types'
import {
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  DEFAULT_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import {
  CowSwapQuoteApiInput,
  getNowPlusThirtyMinutesTimestamp,
  getUsdRate
} from '../utils/helpers/helpers'

export async function getCowSwapTradeQuote(
  deps: CowSwapperDeps,
  input: GetTradeQuoteInput
): Promise<TradeQuote<KnownChainIds.EthereumMainnet>> {
  try {
    const { sellAsset, buyAsset, sellAmount, sellAssetAccountNumber, wallet } = input
    const { adapter, web3 } = deps

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)
    const { assetReference: buyAssetErc20Address, assetNamespace: buyAssetNamespace } = fromAssetId(
      buyAsset.assetId
    )

    if (buyAssetNamespace !== 'erc20' || sellAssetNamespace !== 'erc20') {
      throw new SwapError('[getCowSwapTradeQuote] - Both assets need to be ERC-20 to use CowSwap', {
        code: SwapErrorTypes.UNSUPPORTED_PAIR,
        details: { buyAssetNamespace, sellAssetNamespace }
      })
    }

    const { minimum, maximum } = await getCowSwapMinMax(deps, sellAsset, buyAsset)

    const minQuoteSellAmount = bnOrZero(minimum).times(bn(10).exponentiatedBy(sellAsset.precision))

    // making sure we do not have decimals for cowswap api (can happen at least from minQuoteSellAmount)
    const normalizedSellAmount = normalizeIntegerAmount(
      bnOrZero(sellAmount).lt(minQuoteSellAmount) ? minQuoteSellAmount : sellAmount
    )

    const apiInput: CowSwapQuoteApiInput = {
      sellToken: sellAssetErc20Address,
      buyToken: buyAssetErc20Address,
      receiver: DEFAULT_ADDRESS,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData: DEFAULT_APP_DATA,
      partiallyFillable: false,
      from: DEFAULT_ADDRESS,
      kind: ORDER_KIND_SELL,
      sellAmountBeforeFee: normalizedSellAmount
    }

    /**
     * /v1/quote
     * params: {
     * sellToken: contract address of token to sell
     * buyToken: contractAddress of token to buy
     * receiver: receiver address can be defaulted to "0x0000000000000000000000000000000000000000"
     * validTo: time duration during which quote is valid (eg : 1654851610 as timestamp)
     * appData: appData for the CowSwap quote that can be used later, can be defaulted to "0x0000000000000000000000000000000000000000000000000000000000000000"
     * partiallyFillable: false
     * from: sender address can be defaulted to "0x0000000000000000000000000000000000000000"
     * kind: "sell" or "buy"
     * sellAmountBeforeFee / buyAmountAfterFee: amount in base unit
     * }
     */
    const quoteResponse: AxiosResponse<CowSwapQuoteResponse> =
      await cowService.post<CowSwapQuoteResponse>(`${deps.apiUrl}/v1/quote/`, apiInput)

    const {
      data: { quote }
    } = quoteResponse

    const buyCryptoAmount = bn(quote.buyAmount).div(bn(10).exponentiatedBy(buyAsset.precision))
    const sellCryptoAmount = bn(quote.sellAmount).div(bn(10).exponentiatedBy(sellAsset.precision))
    const rate = buyCryptoAmount.div(sellCryptoAmount).toString()

    const receiveAddress = wallet ? await adapter.getAddress({ wallet }) : DEFAULT_ADDRESS

    const data = getApproveContractData({
      web3,
      spenderAddress: COW_SWAP_VAULT_RELAYER_ADDRESS,
      contractAddress: sellAssetErc20Address
    })

    const [feeDataOptions, sellAssetUsdRate] = await Promise.all([
      adapter.getFeeData({
        to: sellAssetErc20Address,
        value: '0',
        chainSpecific: { from: receiveAddress, contractData: data }
      }),
      getUsdRate(deps, sellAsset)
    ])

    const feeData = feeDataOptions['fast']

    // calculating trade fee in USD
    const tradeFeeFiat = bnOrZero(quote.feeAmount)
      .div(bn(10).exponentiatedBy(sellAsset.precision))
      .multipliedBy(bnOrZero(sellAssetUsdRate))
      .toString()

    return {
      rate,
      minimum,
      maximum,
      feeData: {
        fee: '0', // no miner fee for CowSwap
        chainSpecific: {
          estimatedGas: feeData.chainSpecific.gasLimit,
          gasPrice: feeData.chainSpecific.gasPrice,
          approvalFee: bnOrZero(feeData.chainSpecific.gasLimit)
            .multipliedBy(bnOrZero(feeData.chainSpecific.gasPrice))
            .toString()
        },
        tradeFee: tradeFeeFiat
      },
      sellAmount: normalizedSellAmount,
      buyAmount: quote.buyAmount,
      sources: DEFAULT_SOURCE,
      allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
      buyAsset,
      sellAsset,
      sellAssetAccountNumber
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getCowSwapTradeQuote]', {
      cause: e,
      code: SwapErrorTypes.TRADE_QUOTE_FAILED
    })
  }
}

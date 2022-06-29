import { fromAssetId } from '@shapeshiftoss/caip'
import { AxiosResponse } from 'axios'

import { GetTradeQuoteInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { normalizeIntegerAmount } from '../../utils/helpers/helpers'
import { CowSwapperDeps } from '../CowSwapper'
import { getCowSwapMinMax } from '../getCowSwapMinMax/getCowSwapMinMax'
import { CowSwapQuoteResponse } from '../types'
import {
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  DEFAULT_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  DEFAULT_VALIDTO_TIMESTAMP,
  ORDER_KIND_SELL
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import { getUsdRate } from '../utils/helpers/helpers'

export type CowSwapQuoteApiInput = {
  appData: string
  buyToken: string
  from: string
  kind: string
  partiallyFillable: boolean
  receiver: string
  sellAmountBeforeFee: string
  sellToken: string
  validTo: number
}

export async function getCowSwapTradeQuote(
  deps: CowSwapperDeps,
  input: GetTradeQuoteInput
): Promise<TradeQuote<'eip155:1'>> {
  try {
    const { sellAsset, buyAsset, sellAmount, sellAssetAccountNumber, wallet } = input
    const { adapter, feeAsset } = deps

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
      validTo: DEFAULT_VALIDTO_TIMESTAMP,
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

    const rate = bn(quote.buyAmount)
      .div(quote.sellAmount)
      .times(bn(10).exponentiatedBy(sellAsset.precision - buyAsset.precision))
      .toString()

    const receiveAddress = wallet ? await adapter.getAddress({ wallet }) : DEFAULT_ADDRESS

    const [feeDataOptions, wethUsdRate, usdRateSellAsset] = await Promise.all([
      adapter.getFeeData({
        to: COW_SWAP_VAULT_RELAYER_ADDRESS,
        value: '0',
        chainSpecific: { from: receiveAddress, contractAddress: sellAssetErc20Address }
      }),
      getUsdRate(deps, feeAsset),
      getUsdRate(deps, sellAsset)
    ])

    const feeData = feeDataOptions['fast']

    const fee = bnOrZero(quote.feeAmount)
      .multipliedBy(bnOrZero(usdRateSellAsset))
      .div(bnOrZero(wethUsdRate))
      .div(bn(10).exponentiatedBy(sellAsset.precision - feeAsset.precision))
      .toString()

    return {
      rate,
      minimum,
      maximum,
      feeData: {
        fee,
        chainSpecific: {
          estimatedGas: feeData.chainSpecific.gasLimit,
          gasPrice: feeData.chainSpecific.gasPrice,
          approvalFee: bnOrZero(APPROVAL_GAS_LIMIT)
            .multipliedBy(bnOrZero(feeData.chainSpecific.gasPrice))
            .toString()
        },
        tradeFee: '0'
      },
      sellAmount: quote.sellAmount,
      buyAmount: quote.buyAmount,
      sources: DEFAULT_SOURCE,
      allowanceContract: '',
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

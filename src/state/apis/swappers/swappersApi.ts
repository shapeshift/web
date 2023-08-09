import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import type { GetTradeQuoteInput } from 'lib/swapper/api'
import { getTradeQuotes } from 'lib/swapper/swapper'
import type { TradeQuoteDeps } from 'lib/swapper/types'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote } from 'state/apis/swappers/types'
import type { ReduxState } from 'state/reducer'
import { selectAssets, selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

const getDependencies = (
  state: ReduxState,
  getTradeQuoteInput: GetTradeQuoteInput,
): TradeQuoteDeps => {
  const assets = selectAssets(state)
  const feeAsset = selectFeeAssetById(state, getTradeQuoteInput.sellAsset.assetId)

  const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
  const buyAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.buyAsset.assetId)
  const feeAssetUsdRate = feeAsset ? selectUsdRateByAssetId(state, feeAsset.assetId) : undefined
  const runeAssetUsdRate = selectUsdRateByAssetId(state, thorchainAssetId)

  if (!sellAssetUsdRate) throw Error('missing sellAssetUsdRate')
  if (!buyAssetUsdRate) throw Error('missing buyAssetUsdRate')
  if (!feeAssetUsdRate) throw Error('missing feeAssetUsdRate')
  if (!runeAssetUsdRate) throw Error('missing runeAssetUsdRate')

  return {
    assets,
    sellAssetUsdRate,
    buyAssetUsdRate,
    feeAssetUsdRate,
    runeAssetUsdRate,
  }
}

export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  endpoints: build => ({
    getTradeQuote: build.query<ApiQuote[], GetTradeQuoteInput>({
      queryFn: async (getTradeQuoteInput: GetTradeQuoteInput, { getState }) => {
        const state = getState() as ReduxState
        const { sendAddress, receiveAddress } = getTradeQuoteInput
        const isCrossAccountTrade = sendAddress !== receiveAddress
        const featureFlags: FeatureFlags = selectFeatureFlags(state)
        const enabledSwappers = getEnabledSwappers(featureFlags, isCrossAccountTrade)
        const deps = getDependencies(state, getTradeQuoteInput)

        const quotes = await getTradeQuotes(getTradeQuoteInput, enabledSwappers, deps)

        const quotesWithInputOutputRatios = quotes.map(result => {
          const quote = result && result.isOk() ? result.unwrap() : undefined
          const error = result && result.isErr() ? result.unwrapErr() : undefined
          const inputOutputRatio = quote
            ? getInputOutputRatioFromQuote({
                state,
                quote,
                swapperName: result.swapperName,
              })
            : -Infinity
          return { quote, error, inputOutputRatio, swapperName: result.swapperName }
        })

        const orderedQuotes: ApiQuote[] = orderBy(
          quotesWithInputOutputRatios,
          ['inputOutputRatio', 'swapperName'],
          ['desc', 'asc'],
        )

        return { data: orderedQuotes }
      },
    }),
  }),
})

export const { useGetTradeQuoteQuery } = swappersApi

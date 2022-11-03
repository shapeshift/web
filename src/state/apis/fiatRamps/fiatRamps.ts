import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import type { FiatRamp } from 'components/Modals/FiatRamps/config'
import { supportedFiatRamps } from 'components/Modals/FiatRamps/config'
import type { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'

const moduleLogger = logger.child({ namespace: ['fiatRampApi'] })

export type FiatRampsByAction = {
  [FiatRampAction.Buy]: FiatRamp[]
  [FiatRampAction.Sell]: FiatRamp[]
}

export type FiatRampsByAssetId = {
  byAssetId: {
    [k: AssetId]: FiatRampsByAction | undefined
  }
  buyAssetIds: AssetId[]
  sellAssetIds: AssetId[]
}

export const fiatRampApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'fiatRampApi',
  endpoints: build => ({
    getFiatRamps: build.query<FiatRampsByAssetId, void>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async (_, { dispatch, getState }) => {
        try {
          const activeProviders = Object.values(supportedFiatRamps).filter(provider =>
            provider.isActive((getState() as any).preferences.featureFlags),
          )
          const promiseResults = await Promise.allSettled(
            activeProviders.map(provider => provider.getBuyAndSellList()),
          )

          const data = promiseResults.reduce<FiatRampsByAssetId>(
            (acc, p, idx) => {
              if (p.status === 'rejected') {
                moduleLogger.error(p.reason, 'error fetching fiat ramp')
                return acc
              }
              const ramp = p.value
              const [buyAssetIds, sellAssetIds] = ramp
              buyAssetIds.forEach(assetId => {
                if (!acc.byAssetId[assetId]) acc.byAssetId[assetId] = { buy: [], sell: [] }
                acc.byAssetId[assetId]?.['buy'].push(activeProviders[idx].id)
                if (!acc.buyAssetIds.includes(assetId)) acc.buyAssetIds.push(assetId)
              })
              sellAssetIds.forEach(assetId => {
                if (!acc.byAssetId[assetId]) acc.byAssetId[assetId] = { buy: [], sell: [] }
                acc.byAssetId[assetId]?.['sell'].push(activeProviders[idx].id)
                if (!acc.sellAssetIds.includes(assetId)) acc.sellAssetIds.push(assetId)
              })
              return acc
            },
            { byAssetId: {}, buyAssetIds: [], sellAssetIds: [] },
          )
          const allFiatAssetIds = [...data.buyAssetIds, ...data.sellAssetIds]
          const timeframe = HistoryTimeframe.DAY
          // fetch market data for all fiat ramp asset ids
          allFiatAssetIds.forEach(assetId => {
            // spot market pricing
            dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
            // 24hr price history - needed for "spark charts" on fiat page
            dispatch(marketApi.endpoints.findPriceHistoryByAssetId.initiate({ assetId, timeframe }))
          })
          return { data }
        } catch (e) {
          const error = 'getFiatRampAssets: error fetching fiat ramp(s)'
          moduleLogger.error(e, error)
          return {
            error: {
              error,
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const { useGetFiatRampsQuery } = fiatRampApi

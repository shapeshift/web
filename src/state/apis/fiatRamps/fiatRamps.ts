import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { FiatRamp } from 'components/Modals/FiatRamps/config'
import { supportedFiatRamps } from 'components/Modals/FiatRamps/config'
import type { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

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
      queryFn: async (_, { getState }) => {
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
                console.error(p.reason)
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
          return { data }
        } catch (e) {
          console.error(e)
          const error = 'getFiatRampAssets: error fetching fiat ramp(s)'
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

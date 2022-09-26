import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { supportedFiatRamps } from 'components/Modals/FiatRamps/config'
import type { FiatRampAction, FiatRampAsset } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

const moduleLogger = logger.child({ namespace: ['fiatRampApi'] })

type FiatRampApiReturn = {
  [k in FiatRampAction]: FiatRampAsset[]
}

export const fiatRampApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'fiatRampApi',
  endpoints: build => ({
    getFiatRampAssets: build.query<FiatRampApiReturn, void>({
      // return, args
      queryFn: async () => {
        try {
          const promiseResults = await Promise.allSettled(
            Object.values(supportedFiatRamps)
              .filter(provider => provider.isImplemented)
              .map(provider => provider.getBuyAndSellList()),
          )
          const data = promiseResults.reduce<FiatRampApiReturn>(
            (acc, cur) => {
              if (cur.status === 'rejected') {
                moduleLogger.error(cur.reason, 'error fetching fiat ramp')
                return acc
              }
              const ramp = cur.value
              const [buyAssets, sellAssets] = ramp
              acc['buy'].push(...buyAssets)
              acc['sell'].push(...sellAssets)
              return acc
            },
            { buy: [], sell: [] },
          )
          return { data }
        } catch (e) {
          return {
            error: {
              error: 'getFiatRampAssets: error fetching fiat ramp(s)',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const { useGetFiatRampAssetsQuery } = fiatRampApi

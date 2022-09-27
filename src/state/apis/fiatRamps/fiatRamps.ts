import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { FiatRamp } from 'components/Modals/FiatRamps/config'
import { fiatRamps } from 'components/Modals/FiatRamps/config'
import { supportedFiatRamps } from 'components/Modals/FiatRamps/config'
import type { FiatRampAsset } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

const moduleLogger = logger.child({ namespace: ['fiatRampApi'] })

export type FiatRampApiReturn = {
  [k in FiatRamp]: {
    [k in FiatRampAction]: FiatRampAsset[]
  }
}

export const fiatRampApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'fiatRampApi',
  endpoints: build => ({
    getFiatRampAssets: build.query<FiatRampApiReturn, void>({
      queryFn: async () => {
        try {
          const promiseResults = await Promise.allSettled(
            Object.values(supportedFiatRamps)
              .filter(provider => provider.isImplemented)
              .map(provider => provider.getBuyAndSellList()),
          )

          const initial = fiatRamps.reduce<FiatRampApiReturn>((acc, cur) => {
            acc[cur] = { [FiatRampAction.Buy]: [], [FiatRampAction.Sell]: [] }
            return acc
          }, {} as FiatRampApiReturn)

          const data = promiseResults.reduce<FiatRampApiReturn>((acc, p, idx) => {
            if (p.status === 'rejected') {
              moduleLogger.error(p.reason, 'error fetching fiat ramp')
              return acc
            }
            const ramp = p.value
            const [buyAssets, sellAssets] = ramp
            acc[fiatRamps[idx]][FiatRampAction.Buy].push(...buyAssets)
            acc[fiatRamps[idx]][FiatRampAction.Sell].push(...sellAssets)
            return acc
          }, initial)
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

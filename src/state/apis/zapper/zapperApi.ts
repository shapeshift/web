import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import qs from 'qs'
import { setTimeoutAsync } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import { createApiClient } from './client'

const ZAPPER_BASE_URL = 'https://api.zapper.xyz'

const authorization = `Basic ${Buffer.from(
  `${getConfig().REACT_APP_ZAPPER_API_KEY}:`,
  'binary',
).toString('base64')}`

const headers = {
  accept: 'application/json',
  authorization,
}

const zapperClient = createApiClient(ZAPPER_BASE_URL)

type GetAppBalancesInput = {
  accountIds: AccountId[]
}

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getAppBalances: build.query<any, GetAppBalancesInput>({
      queryFn: async ({ accountIds }) => {
        // Refresh job
        const evmAddresses = accountIds.map(accountId => fromAccountId(accountId).account)
        const evmNetworks = ['ethereum']
        await zapperClient.post('/v2/balances/apps', undefined, {
          headers,
          // Encode query params with arrayFormat: 'repeat' because zapper api derpexcts it
          paramsSerializer: params => {
            return qs.stringify(params, { arrayFormat: 'repeat' })
          },
          queries: {
            networks: evmNetworks, // TODO: programmatic
            addresses: evmAddresses,
          },
        })
        // https://docs.zapper.xyz/docs/apis/api-syntax
        // "Alternatively, you can just wait 10 seconds for the job to finish if you do not want to poll for the job status."
        await setTimeoutAsync(10000)

        const data = await zapperClient.get('/v2/balances/apps', {
          headers,
          // Encode query params with arrayFormat: 'repeat' because zapper api derpexcts it
          paramsSerializer: params => {
            return qs.stringify(params, { arrayFormat: 'repeat' })
          },
          queries: {
            networks: evmNetworks, // TODO: programmatic
            addresses: evmAddresses,
          },
        })
        console.log({ data })
        return { data }
      },
    }),
  }),
})

export const { useGetAppBalancesQuery } = zapperApi

import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { getConfig } from 'config'
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

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getAppBalances: build.query<any, void>({
      queryFn: async () => {
        // Refresh job
        await zapperClient.post('/v2/balances/apps', undefined, {
          headers,
          queries: {
            'networks[]': 'ethereum', // TODO: programmatic
            'addresses[]': '0xb8FF589DbbEc0DDe6401DC9572F54f8EC779b364',
          },
        })
        // https://docs.zapper.xyz/docs/apis/api-syntax
        // "Alternatively, you can just wait 10 seconds for the job to finish if you do not want to poll for the job status."
        await setTimeoutAsync(10000)

        const data = await zapperClient.get('/v2/balances/apps', {
          headers,
          queries: {
            'networks[]': 'ethereum', // TODO: programmatic
            'addresses[]': '0xb8FF589DbbEc0DDe6401DC9572F54f8EC779b364',
          },
        })
        return { data }
      },
    }),
  }),
})

export const { useGetAppBalancesQuery } = zapperApi

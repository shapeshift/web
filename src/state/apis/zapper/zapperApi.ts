import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { getConfig } from 'config'
import { setTimeoutAsync } from 'lib/utils'
// import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import { createApiClient } from './client'

// const moduleLogger = logger.child({ module: 'zapperApi' })

const ZAPPER_BASE_URL = 'https://api.zapper.xyz'

const auth = {
  username: `Basic ${getConfig().REACT_APP_ZAPPER_API_KEY}`,
  password: '',
}

const zapperClient = createApiClient(ZAPPER_BASE_URL)

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    // TODO: First need to POST to run an initial refresh job
    getAppBalances: build.query<any, void>({
      queryFn: async () => {
        // Refresh job
        await zapperClient.post('/v2/balances/apps', undefined, {
          auth,
          queries: {
            'networks[]': ['ethereum'], // TODO: programmatic
            'addresses[]': [''],
          },
        })
        // https://docs.zapper.xyz/docs/apis/api-syntax
        // "Alternatively, you can just wait 10 seconds for the job to finish if you do not want to poll for the job status."
        await setTimeoutAsync(10000)

        const data = await zapperClient.get('/v2/balances/apps', {
          auth,
          queries: {
            'networks[]': ['ethereum'], // TODO: programmatic
            'addresses[]': [''],
          },
        })
        console.log({ data })
        return { data }
      },
    }),
  }),
})

export const { useGetAppBalancesQuery } = zapperApi

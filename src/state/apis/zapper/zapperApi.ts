import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { evmChainIds, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import uniq from 'lodash/uniq'
import qs from 'qs'
import { setTimeoutAsync } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import type { V2BalancesAppsResponseType } from './client'
import { chainIdToZapperNetwork, createApiClient, zapperNetworkToChainId } from './client'

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

export type GetAppBalancesOutput = Record<AccountId, V2BalancesAppsResponseType>

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getAppBalances: build.query<GetAppBalancesOutput, GetAppBalancesInput>({
      queryFn: async ({ accountIds }) => {
        // Refresh job
        const evmAddresses = uniq(
          accountIds
            .filter(accountId => isEvmChainId(fromAccountId(accountId).chainId))
            .map(accountId => fromAccountId(accountId).account),
        )
        const evmNetworks = evmChainIds.map(chainId => chainIdToZapperNetwork(chainId))
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

        const zerionV2AppBalancesData = await zapperClient.get('/v2/balances/apps', {
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

        const data = zerionV2AppBalancesData.reduce<GetAppBalancesOutput>((acc, current) => {
          const chainId = zapperNetworkToChainId(current.network)
          if (!chainId) return acc
          const accountId = toAccountId({
            account: current.address,
            chainId,
          })

          if (!acc[accountId]) acc[accountId] = []
          acc[accountId].push(current)

          return acc
        }, {})
        return { data }
      },
    }),
  }),
})

export const { useGetAppBalancesQuery } = zapperApi

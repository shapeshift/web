import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import qs from 'qs'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

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

type GetAppBalancesOutput = AssetId[]

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getZapperUniV2PoolAssetIds: build.query<GetAppBalancesOutput, void>({
      queryFn: async () => {
        const evmNetworks = [chainIdToZapperNetwork(ethChainId)]

        const zerionV2AppTokensData = await zapperClient.getV2AppTokens({
          params: {
            appSlug: 'uniswap-v2',
          },
          headers,
          // Encode query params with arrayFormat: 'repeat' because zapper api derpexcts it
          paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
          queries: {
            groupId: 'pool',
            networks: evmNetworks,
          },
        })

        const data = zerionV2AppTokensData.map(appTokenData =>
          toAssetId({
            chainId: zapperNetworkToChainId(appTokenData.network)!,
            assetNamespace: 'erc20', // TODO: bep20
            assetReference: appTokenData.address,
          }),
        )

        return { data }
      },
    }),
  }),
})

export const { useGetZapperUniV2PoolAssetIdsQuery } = zapperApi

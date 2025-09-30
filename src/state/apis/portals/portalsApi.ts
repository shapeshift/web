import { createApi } from '@reduxjs/toolkit/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId } from '@shapeshiftoss/utils'
import axios from 'axios'

import type { SupportedPortalsNetwork } from './utils'
import { chainIdToPortalsNetwork, portalsNetworkToChainId } from './utils'

import { getConfig } from '@/config'
import type { GetTokensResponse } from '@/lib/portals/types'
import { isSome } from '@/lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from '@/state/apis/const'
import type { ReduxState } from '@/state/reducer'
import { foxEthLpAssetIds } from '@/state/slices/opportunitiesSlice/constants'
import { selectFeatureFlag } from '@/state/slices/preferencesSlice/selectors'

const PORTALS_BASE_URL = getConfig().VITE_PORTALS_BASE_URL
const PORTALS_API_KEY = getConfig().VITE_PORTALS_API_KEY

type GetPortalsUniV2PoolAssetIdsOutput = AssetId[]

export const portalsApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'portalsApi',
  endpoints: build => ({
    getPortalsUniV2PoolAssetIds: build.query<GetPortalsUniV2PoolAssetIdsOutput, void>({
      queryFn: async (_input, { getState }) => {
        const state = getState() as ReduxState
        const DynamicLpAssets = selectFeatureFlag(state, 'DynamicLpAssets')

        if (!DynamicLpAssets) return Promise.resolve({ data: [...foxEthLpAssetIds] })

        const evmNetworks = [chainIdToPortalsNetwork(ethChainId)]
        const networks = evmNetworks.map(network => network?.toLowerCase()).filter(isSome)

        const { data } = await axios.get<GetTokensResponse>(`${PORTALS_BASE_URL}/v2/tokens`, {
          headers: {
            Authorization: `Bearer ${PORTALS_API_KEY}`,
          },
          params: {
            platforms: ['uniswapv2'],
            networks,
            minLiquidity: '100000',
            limit: '250',
          },
          paramsSerializer: {
            indexes: null,
          },
        })

        if (!data?.tokens?.length) throw new Error('No Portals data, sadpepe.jpg')

        const assetIds = data.tokens
          .map(tokenData => {
            const chainId = portalsNetworkToChainId(tokenData.network as SupportedPortalsNetwork)
            if (!chainId) return undefined

            return toAssetId({
              chainId,
              assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
              assetReference: tokenData.address,
            })
          })
          .filter(isSome)

        return { data: assetIds }
      },
    }),
  }),
})

export const { useGetPortalsUniV2PoolAssetIdsQuery } = portalsApi

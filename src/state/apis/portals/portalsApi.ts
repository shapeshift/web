import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId } from '@shapeshiftoss/utils'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import qs from 'qs'

import type { PortalsAssetBase, SupportedPortalsNetwork, V2AppResponseType } from './validators'
import { chainIdToPortalsNetwork, portalsNetworkToChainId } from './validators'

import { getConfig } from '@/config'
import type {
  GetPlatformsResponse,
  GetTokensResponse,
  Platform,
  TokenInfo,
} from '@/lib/portals/types'
import { isSome } from '@/lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from '@/state/apis/const'
import type { ReduxState } from '@/state/reducer'
import { foxEthLpAssetIds } from '@/state/slices/opportunitiesSlice/constants'
import { selectFeatureFlag } from '@/state/slices/preferencesSlice/selectors'

const PORTALS_BASE_URL = getConfig().VITE_PORTALS_BASE_URL
const PORTALS_API_KEY = getConfig().VITE_PORTALS_API_KEY

const options: AxiosRequestConfig = {
  method: 'GET' as const,
  baseURL: PORTALS_BASE_URL,
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${PORTALS_API_KEY}`,
  },
  // Encode query params with arrayFormat: 'repeat' because portals api expects it
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
}

const headers = {
  accept: 'application/json',
  Authorization: `Bearer ${PORTALS_API_KEY}`,
}

type GetPortalsUniV2PoolAssetIdsOutput = AssetId[]
type GetPortalsAppTokensOutput = Record<AssetId, PortalsAssetBase>

export const portalsApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'portalsApi',
  endpoints: build => ({
    getPortalsAppsOutput: build.query<Record<string, V2AppResponseType>, void>({
      queryFn: async () => {
        try {
          if (!PORTALS_BASE_URL) throw new Error('VITE_PORTALS_BASE_URL not set')
          if (!PORTALS_API_KEY) throw new Error('VITE_PORTALS_API_KEY not set')

          const url = `${PORTALS_BASE_URL}/v2/platforms`
          const { data: platforms } = await axios.get<GetPlatformsResponse>(url, {
            headers: {
              Authorization: `Bearer ${PORTALS_API_KEY}`,
            },
          })

          const platformsById = platforms
            .filter(platform => !['basic', 'native'].includes(platform.platform))
            .reduce<Record<string, V2AppResponseType>>((acc, platform: Platform) => {
              const id = platform.platform
              if (!acc[id]) {
                acc[id] = {
                  id,
                  category: null,
                  slug: id,
                  name: platform.name,
                  imgUrl: platform.image,
                  twitterUrl: null,
                  farcasterUrl: null,
                  tags: [],
                  token: null,
                  groups: [],
                }
              }

              return acc
            }, {})

          return { data: platformsById }
        } catch (e) {
          console.error(e)
          const message = e instanceof Error ? e.message : 'Error fetching Portals platforms data'
          return {
            error: {
              error: message,
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getPortalsAppTokensOutput: build.query<GetPortalsAppTokensOutput, void>({
      queryFn: async () => {
        try {
          if (!PORTALS_BASE_URL) throw new Error('VITE_PORTALS_BASE_URL not set')
          if (!PORTALS_API_KEY) throw new Error('VITE_PORTALS_API_KEY not set')

          const evmNetworks = [chainIdToPortalsNetwork(ethChainId)]
          const networks = evmNetworks.map(network => network?.toLowerCase()).filter(isSome)

          const url = `${PORTALS_BASE_URL}/v2/tokens`
          const params = {
            platforms: ['uniswapv2'],
            networks,
            minLiquidity: '100000',
            limit: '250', // Max allowed by portals API
          }

          const { data: res } = await axios.get<GetTokensResponse>(url, {
            headers: {
              Authorization: `Bearer ${PORTALS_API_KEY}`,
            },
            params,
          })

          const { data } = res.tokens.reduce<{
            data: GetPortalsAppTokensOutput
          }>(
            (acc: { data: GetPortalsAppTokensOutput }, tokenData: TokenInfo) => {
              const chainId = portalsNetworkToChainId(tokenData.network as SupportedPortalsNetwork)
              if (!chainId) return acc

              const assetId = toAssetId({
                chainId,
                assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                assetReference: tokenData.address,
              })

              const PortalsAssetBase: PortalsAssetBase = {
                type: 'app-token',
                address: tokenData.address,
                symbol: tokenData.symbol,
                decimals: tokenData.decimals.toString(),
                key: tokenData.key,
                price: Number(tokenData.price || 0),
                network: tokenData.network as SupportedPortalsNetwork,
                appId: 'Uniswap V2',
                tokens: (tokenData.tokens || []).map(tokenAddress => ({
                  type: 'base-token',
                  address: tokenAddress,
                  network: tokenData.network as SupportedPortalsNetwork,
                  symbol: '', // This no exist from Portals, tokenData.tokens only gives us addresses
                  decimals: 'x', // Also a placeholder, unused here
                })),
                dataProps: {
                  liquidity: tokenData.liquidity,
                  apy: tokenData.metrics?.apy ? Number(tokenData.metrics.apy) : undefined,
                  volume: tokenData.metrics?.volumeUsd1d
                    ? Number(tokenData.metrics.volumeUsd1d)
                    : undefined,
                },
                displayProps: {
                  label: tokenData.name,
                  images: tokenData.images || [],
                },
              }

              acc.data[assetId] = PortalsAssetBase

              return acc
            },
            { data: {} },
          )

          return { data }
        } catch (e) {
          console.error(e)
          const message = e instanceof Error ? e.message : 'Error fetching Portals tokens data'
          return {
            error: {
              error: message,
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const portals = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'portals',
  endpoints: build => ({
    getPortalsUniV2PoolAssetIds: build.query<GetPortalsUniV2PoolAssetIdsOutput, void>({
      queryFn: async (_input, { getState }) => {
        const state = getState() as ReduxState
        const DynamicLpAssets = selectFeatureFlag(state, 'DynamicLpAssets')

        if (!DynamicLpAssets) return Promise.resolve({ data: [...foxEthLpAssetIds] })

        const evmNetworks = [chainIdToPortalsNetwork(ethChainId)]
        const networks = evmNetworks.map(network => network?.toLowerCase()).filter(isSome)

        const url = `/v2/tokens`
        const params = {
          platforms: ['uniswapv2'],
          networks,
          minLiquidity: '100000',
          limit: '250',
        }
        const payload = { ...options, params, headers, url }
        const { data } = await axios.request<GetTokensResponse>({ ...payload })

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

export const { useGetPortalsUniV2PoolAssetIdsQuery } = portals

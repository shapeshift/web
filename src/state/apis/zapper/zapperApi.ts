import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import qs from 'qs'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { assets, makeAsset } from 'state/slices/assetsSlice/assetsSlice'

import type { V2NftUserItem } from './client'
import {
  chainIdToZapperNetwork,
  createApiClient,
  ZapperAppId,
  ZapperGroupId,
  zapperNetworkToChainId,
} from './client'

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

type GetZapperNftUserTokens = {
  accountId: AccountId
}

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getZapperUniV2PoolAssetIds: build.query<GetAppBalancesOutput, void>({
      queryFn: async (_, { dispatch }) => {
        const evmNetworks = [chainIdToZapperNetwork(ethChainId)]

        const zapperV2AppTokensData = await zapperClient.getV2AppTokens({
          params: {
            // Only get uniswap v2 pools for now
            appSlug: ZapperAppId.UniswapV2,
          },
          headers,
          // Encode query params with arrayFormat: 'repeat' because zapper api derpexcts it
          paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
          queries: {
            groupId: ZapperGroupId.Pool,
            networks: evmNetworks,
          },
        })

        const data = zapperV2AppTokensData.map(appTokenData =>
          toAssetId({
            chainId: zapperNetworkToChainId(appTokenData.network)!,
            assetNamespace: 'erc20', // TODO: bep20
            assetReference: appTokenData.address,
          }),
        )

        const zapperAssets = zapperV2AppTokensData.reduce<AssetsState>(
          (acc, appTokenData) => {
            const assetId = toAssetId({
              chainId: zapperNetworkToChainId(appTokenData.network)!,
              assetNamespace: 'erc20', // TODO: bep20
              assetReference: appTokenData.address,
            })

            acc.byId[assetId] = makeAsset({
              assetId,
              symbol: appTokenData.symbol,
              name: appTokenData.displayProps.label,
              precision: appTokenData.decimals,
              // TODO: introspect underlying assets if they exist, and display WETH as ETH
              icons: appTokenData.displayProps.images,
            })
            acc.ids.push(assetId)
            return acc
          },
          { byId: {}, ids: [] },
        )

        dispatch(assets.actions.upsertAssets(zapperAssets))

        return { data }
      },
    }),
    getZapperNftUserTokens: build.query<V2NftUserItem[], GetZapperNftUserTokens>({
      queryFn: async ({ accountId }) => {
        const { account } = fromAccountId(accountId)
        // TODO(0xdef1cafe): remove
        const userAddress = '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c' ?? account // willywonka.eth
        let data: V2NftUserItem[] = []
        // https://studio.zapper.fi/docs/apis/api-syntax#v2nftusertokens
        /**
         * docs about cursor are wrong lmeow
         * check the length of returned items to see if there are more
         */
        const limit = 100
        while (true) {
          const res = await zapperClient.getV2NftUserTokens({
            // Encode query params with arrayFormat: 'repeat' because zapper api derpexcts it
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            headers,
            queries: { userAddress, limit: limit.toString() },
          })
          if (!res?.items?.length) break
          if (res?.items?.length) data = data.concat(res.items)
          if (res?.items?.length < limit) break
        }
        return { data }
      },
    }),
  }),
})

export const { useGetZapperUniV2PoolAssetIdsQuery, useGetZapperNftUserTokensQuery } = zapperApi

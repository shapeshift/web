import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import qs from 'qs'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { assets, makeAsset } from 'state/slices/assetsSlice/assetsSlice'

import type { V2NftCollectionType, V2NftUserItem } from './client'
import {
  chainIdToZapperNetwork,
  createApiClient,
  ZapperAppId,
  ZapperGroupId,
  zapperNetworkToChainId,
} from './client'

const moduleLogger = logger.child({ namespace: ['zapperApi'] })

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

type GetZapperNftUserTokensInput = {
  accountIds: AccountId[]
}

type GetZapperCollectionsInput = {
  accountIds: AccountId[]
  collectionAddresses: string[]
}

// addresses are repeated across EVM chains
const accountIdsToEvmAddresses = (accountIds: AccountId[]): string[] =>
  Array.from(
    new Set(
      accountIds
        .map(fromAccountId)
        .filter(({ chainId }) => isEvmChainId(chainId))
        .map(({ account }) => account),
    ),
  )

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
          // Encode query params with arrayFormat: 'repeat' because zapper api expects it
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
    getZapperNftUserTokens: build.query<V2NftUserItem[], GetZapperNftUserTokensInput>({
      queryFn: async ({ accountIds }) => {
        let data: V2NftUserItem[] = []

        const userAddresses = accountIdsToEvmAddresses(accountIds)

        for (const userAddress of userAddresses) {
          // https://studio.zapper.fi/docs/apis/api-syntax#v2nftusertokens
          /**
           * docs about cursor are wrong lmeow
           * check the length of returned items to see if there are more
           */
          const limit = 100
          while (true) {
            try {
              const res = await zapperClient.getV2NftUserTokens({
                // Encode query params with arrayFormat: 'repeat' because zapper api expects it
                paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
                headers,
                queries: { userAddress, limit: limit.toString() },
              })
              if (!res?.items?.length) break
              if (res?.items?.length) data = data.concat(res.items)
              if (res?.items?.length < limit) break
            } catch (e) {
              moduleLogger.warn(e, 'getZapperNftUserTokens')
              break
            }
          }
        }
        return { data }
      },
    }),
    getZapperCollections: build.query<V2NftCollectionType[], GetZapperCollectionsInput>({
      queryFn: async ({ accountIds, collectionAddresses }) => {
        const addresses = accountIdsToEvmAddresses(accountIds)
        const { items: data } = await zapperClient.getV2NftBalancesCollections({
          headers,
          // yes this is actually how the api expects it
          queries: {
            'addresses[]': addresses,
            'collectionAddresses[]': collectionAddresses,
          },
        })
        return { data }
      },
    }),
  }),
})

export const {
  useGetZapperUniV2PoolAssetIdsQuery,
  useGetZapperNftUserTokensQuery,
  useGetZapperCollectionsQuery,
} = zapperApi

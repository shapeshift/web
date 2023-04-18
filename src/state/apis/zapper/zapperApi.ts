import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import { WETH_TOKEN_CONTRACT_ADDRESS } from 'contracts/constants'
import qs from 'qs'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { assets as assetsSlice, makeAsset } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets } from 'state/slices/selectors'

import type { V2NftCollectionType, V2NftUserItem, ZapperAssetBase } from './client'
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

export type GetZapperUniV2PoolAssetIdsOutput = AssetId[]
export type GetZapperAppBalancesOutput = Record<AssetId, ZapperAssetBase>

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
    getZapperAppBalancesOutput: build.query<GetZapperAppBalancesOutput, void>({
      queryFn: async (_, { dispatch, getState }) => {
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

        const data = zapperV2AppTokensData.reduce<GetZapperAppBalancesOutput>(
          (acc, appTokenData) => {
            // This will never happen in this particular case because zodios will fail if e.g appTokenData.network is undefined
            // But zapperNetworkToChainId returns ChainId | undefined, as we may be calling it with invalid, casted "valid network"
            const chainId = zapperNetworkToChainId(appTokenData.network)
            if (!chainId) return acc
            const assetId = toAssetId({
              chainId,
              assetNamespace: 'erc20', // TODO: bep20
              assetReference: appTokenData.address,
            })

            acc[assetId] = appTokenData
            return acc
          },
          {},
        )

        const assets = selectAssets(getState() as ReduxState)
        const zapperAssets = zapperV2AppTokensData.reduce<AssetsState>(
          (acc, appTokenData) => {
            // This will never happen in this particular case because zodios will fail if e.g appTokenData.network is undefined
            // But zapperNetworkToChainId returns ChainId | undefined, as we may be calling it with invalid, casted "valid network"
            const chainId = zapperNetworkToChainId(appTokenData.network)
            if (!chainId) return acc
            const assetId = toAssetId({
              chainId,
              assetNamespace: 'erc20', // TODO: bep20
              assetReference: appTokenData.address,
            })

            const underlyingAssets = appTokenData.tokens.map(token => {
              const assetId = toAssetId({
                chainId,
                assetNamespace: 'erc20', // TODO: bep20
                assetReference: token.address,
              })
              const asset =
                token.address.toLowerCase() === WETH_TOKEN_CONTRACT_ADDRESS.toLowerCase()
                  ? assets[ethAssetId]
                  : assets[assetId]

              return asset
            })

            const name = underlyingAssets.every(asset => asset && asset.symbol)
              ? `${underlyingAssets.map(asset => asset?.symbol).join('/')} Pool`
              : appTokenData.displayProps.label.replace('WETH', 'ETH')
            const icons = underlyingAssets.map((underlyingAsset, i) => {
              return underlyingAsset?.icon ?? appTokenData.displayProps.images[i]
            })

            acc.byId[assetId] = makeAsset({
              assetId,
              symbol: appTokenData.symbol,
              // WETH should be displayed as ETH in the UI due to the way UNI-V2 works
              // ETH is used for depositing/withdrawing, but WETH is used under the hood
              name,
              precision: appTokenData.decimals,
              icons,
            })
            acc.ids.push(assetId)
            return acc
          },
          { byId: {}, ids: [] },
        )

        dispatch(assetsSlice.actions.upsertAssets(zapperAssets))

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

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapper = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapper',
  endpoints: build => ({
    getZapperUniV2PoolAssetIds: build.query<GetZapperUniV2PoolAssetIdsOutput, void>({
      queryFn: async (_, { dispatch }) => {
        const maybeZapperV2AppTokensData = await dispatch(
          zapperApi.endpoints.getZapperAppBalancesOutput.initiate(),
        )

        if (!maybeZapperV2AppTokensData.data) throw new Error('No Zapper data, sadpepe.jpg')

        const zapperV2AppTokensData = Object.values(maybeZapperV2AppTokensData.data)

        const data = zapperV2AppTokensData
          .map(appTokenData => {
            // This will never happen in this particular case because zodios will fail if e.g appTokenData.network is undefined
            // But zapperNetworkToChainId returns ChainId | undefined, as we may be calling it with invalid, casted "valid network"
            const chainId = zapperNetworkToChainId(appTokenData.network)
            if (!chainId) return undefined

            return toAssetId({
              chainId,
              assetNamespace: 'erc20', // TODO: bep20
              assetReference: appTokenData.address,
            })
          })
          .filter(isSome)

        return { data }
      },
    }),
  }),
})

export const { useGetZapperNftUserTokensQuery, useGetZapperCollectionsQuery } = zapperApi

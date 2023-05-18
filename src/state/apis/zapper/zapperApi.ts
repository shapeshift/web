import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
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

import { accountIdsToEvmAddresses } from '../nft/utils'
import type {
  V2NftBalancesCollectionsResponseType,
  V2NftCollectionType,
  V2NftUserItem,
  V2NftUserTokensResponseType,
  ZapperAssetBase,
} from './validators'
import {
  chainIdToZapperNetwork,
  V2AppTokensResponse,
  V2NftBalancesCollectionsResponse,
  ZapperAppId,
  ZapperGroupId,
  zapperNetworkToChainId,
} from './validators'

const moduleLogger = logger.child({ namespace: ['zapperApi'] })

const ZAPPER_BASE_URL = 'https://api.zapper.xyz'

const authorization = `Basic ${Buffer.from(
  `${getConfig().REACT_APP_ZAPPER_API_KEY}:`,
  'binary',
).toString('base64')}`

const options: AxiosRequestConfig = {
  method: 'GET' as const,
  baseURL: ZAPPER_BASE_URL,
  headers: {
    accept: 'application/json',
    authorization,
  },
  // Encode query params with arrayFormat: 'repeat' because zapper api expects it
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
}

const headers = {
  accept: 'application/json',
  authorization,
}

export type GetZapperUniV2PoolAssetIdsOutput = AssetId[]
export type GetZapperAppBalancesOutput = Record<AssetId, ZapperAssetBase>

type GetZapperNftUserTokensInput = {
  accountIds: AccountId[]
}

type GetZapperCollectionsInput = {
  accountIds: AccountId[]
  collectionAddresses: string[]
}

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getZapperAppBalancesOutput: build.query<GetZapperAppBalancesOutput, void>({
      queryFn: async (_, { dispatch, getState }) => {
        const evmNetworks = [chainIdToZapperNetwork(ethChainId)]

        const url = `/v2/apps/${ZapperAppId.UniswapV2}/tokens`
        const params = {
          groupId: ZapperGroupId.Pool,
          networks: evmNetworks,
        }
        const payload = { ...options, params, headers, url }
        const { data: res } = await axios.request({ ...payload })
        const zapperV2AppTokensData = V2AppTokensResponse.parse(res)

        const parsedData = zapperV2AppTokensData.reduce<GetZapperAppBalancesOutput>(
          (acc, appTokenData) => {
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

        return { data: parsedData }
      },
    }),
    getZapperNftUserTokens: build.query<V2NftUserItem[], GetZapperNftUserTokensInput>({
      queryFn: async ({ accountIds }) => {
        let data: V2NftUserItem[] = []

        const userAddresses = accountIdsToEvmAddresses(accountIds)
        // TODO: support other networks - note, Polygon is officially supported but returns no data
        // So we'll need to use another provider than Zapper, and conform to the same interface
        const network = chainIdToZapperNetwork(ethChainId)!

        for (const userAddress of userAddresses) {
          // https://studio.zapper.fi/docs/apis/api-syntax#v2nftusertokens
          /**
           * docs about cursor are wrong lmeow
           * check the length of returned items to see if there are more
           */
          const limit = 100
          while (true) {
            try {
              const url = `/v2/nft/user/tokens`
              const params = {
                userAddress,
                network,
              }
              const payload = { ...options, params, headers, url }
              const { data: res } = await axios.request<V2NftUserTokensResponseType>({ ...payload })
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
        const params = {
          'addresses[]': addresses,
          'collectionAddresses[]': collectionAddresses,
        }
        const url = `/v2/nft/balances/collections`
        const payload = { ...options, params, headers, url }
        const { data } = await axios.request<V2NftBalancesCollectionsResponseType>({
          ...payload,
        })

        const { items: validatedData } = V2NftBalancesCollectionsResponse.parse(data)
        return { data: validatedData }
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

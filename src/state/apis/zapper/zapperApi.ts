import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, toAccountId, toAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { WETH_TOKEN_CONTRACT_ADDRESS } from 'contracts/constants'
import type { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { toBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { assets as assetsSlice, makeAsset } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import type {
  AssetIdsTuple,
  OpportunityId,
  OpportunityMetadataBase,
  ReadOnlyOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import { selectFeatureFlag } from 'state/slices/preferencesSlice/selectors'

import { accountIdsToEvmAddresses } from '../nft/utils'
import type {
  SupportedZapperNetwork,
  V2AppResponseType,
  V2NftBalancesCollectionsResponseType,
  V2NftCollectionType,
  V2NftUserItem,
  V2NftUserTokensResponseType,
  ZapperAssetBase,
} from './validators'
import {
  chainIdToZapperNetwork,
  V2AppsBalancesResponse,
  V2AppsResponse,
  V2AppTokensResponse,
  V2NftBalancesCollectionsResponse,
  ZAPPER_NETWORKS_TO_CHAIN_ID_MAP,
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
export type GetZapperAppTokensOutput = Record<AssetId, ZapperAssetBase>

type GetZapperNftUserTokensInput = {
  accountIds: AccountId[]
}

type GetZapperAppsbalancesInput = void // void in the interim, but should eventually be consumed programatically so we are reactive on accounts
// {
// accountIds: AccountId[]
// }

type GetZapperCollectionsInput = {
  accountIds: AccountId[]
  collectionAddresses: string[]
}

type ReadOnlyOpportunityMetadata = Omit<OpportunityMetadataBase, 'provider'> & { provider: string }
type ReadOnlyProviderMetadata = Omit<DefiProviderMetadata, 'provider'> & { provider: string }

export type GetZapperAppsBalancesOutput = {
  userData: ReadOnlyOpportunityType[]
  opportunities: Record<string, ReadOnlyOpportunityMetadata>
  metadataByProvider: Record<string, ReadOnlyProviderMetadata>
}

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getZapperAppsOutput: build.query<Record<ZapperAppId, V2AppResponseType>, void>({
      queryFn: async () => {
        const url = `/v2/apps`
        const payload = { ...options, headers, url }
        const { data: res } = await axios.request({ ...payload })
        try {
          const parsedZapperV2AppsData = V2AppsResponse.parse(res)

          const zapperV2AppsDataByAppId = parsedZapperV2AppsData.reduce<
            Record<ZapperAppId, V2AppResponseType>
          >(
            (acc, app) => Object.assign(acc, { [app.id]: app }),
            {} as Record<ZapperAppId, V2AppResponseType>,
          )

          return { data: zapperV2AppsDataByAppId }
        } catch (e) {
          moduleLogger.warn(e, 'getZapperAppsOutput')

          const message = e instanceof Error ? e.message : 'Error fetching Zapper apps data'
          return {
            error: {
              error: message,
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getZapperAppTokensOutput: build.query<GetZapperAppTokensOutput, void>({
      queryFn: async (_, { dispatch, getState }) => {
        const evmNetworks = [chainIdToZapperNetwork(ethChainId)]

        // only UNI-V2 supported for now
        const url = `/v2/apps/${ZapperAppId.UniswapV2}/tokens`
        const params = {
          groupId: ZapperGroupId.Pool,
          networks: evmNetworks,
        }
        const payload = { ...options, params, headers, url }
        const { data: res } = await axios.request({ ...payload })
        const zapperV2AppTokensData = V2AppTokensResponse.parse(res)

        const parsedData = zapperV2AppTokensData.reduce<GetZapperAppTokensOutput>(
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

            const underlyingAssets = (appTokenData.tokens ?? []).map(token => {
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
              : (appTokenData.displayProps?.label ?? '').replace('WETH', 'ETH')
            const icons = underlyingAssets.map((underlyingAsset, i) => {
              return underlyingAsset?.icon ?? appTokenData.displayProps?.images[i] ?? ''
            })

            acc.byId[assetId] = makeAsset({
              assetId,
              symbol: appTokenData.symbol ?? '',
              // WETH should be displayed as ETH in the UI due to the way UNI-V2 works
              // ETH is used for depositing/withdrawing, but WETH is used under the hood
              name,
              precision: appTokenData.decimals ?? 0,
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
          zapperApi.endpoints.getZapperAppTokensOutput.initiate(),
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
    getZapperAppsBalancesOutput: build.query<
      GetZapperAppsBalancesOutput,
      GetZapperAppsbalancesInput
    >({
      queryFn: async (_input, { dispatch, getState }) => {
        const ReadOnlyAssets = selectFeatureFlag(getState() as any, 'ReadOnlyAssets')

        if (!ReadOnlyAssets)
          return {
            data: {
              userData: [],
              opportunities: {},
              metadataByProvider: {},
            },
          }

        const maybeZapperV2AppsData = await dispatch(
          zapperApi.endpoints.getZapperAppsOutput.initiate(),
        )

        const accountIds = selectWalletAccountIds(getState() as ReduxState)

        const assets = selectAssets(getState() as ReduxState)
        const evmNetworks = evmChainIds.map(chainIdToZapperNetwork).filter(isSome)

        const addresses = accountIdsToEvmAddresses(accountIds)
        const url = `/v2/balances/apps`
        const params = {
          'addresses[]': addresses,
          'networks[]': evmNetworks,
        }
        const payload = { ...options, params, headers, url }
        const { data: res } = await axios.request({ ...payload })
        try {
          const zapperV2AppsBalancessData = V2AppsBalancesResponse.parse(res)

          const parsedOpportunities = zapperV2AppsBalancessData.reduce<GetZapperAppsBalancesOutput>(
            (acc, appAccountBalance) => {
              const appId = appAccountBalance.appId
              const appName = appAccountBalance.appName
              const appImage = appAccountBalance.appImage
              const accountId = toAccountId({
                chainId:
                  ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[
                    appAccountBalance.network as SupportedZapperNetwork
                  ],
                account: appAccountBalance.address,
              })

              // [0] only for debugging, obviously support all products eventually
              const appAccountOpportunities = (appAccountBalance.products[0]?.assets ?? [])
                .map<ReadOnlyOpportunityType>(asset => {
                  const stakedAmountCryptoBaseUnit = asset.balanceRaw ?? '0'
                  const fiatAmount = bnOrZero(asset.balanceUSD).toString()
                  const apy = bnOrZero(asset.dataProps?.apy).toString()
                  const tvl = bnOrZero(asset.dataProps?.liquidity).toString()
                  const icon = asset.displayProps?.images?.[0] ?? ''
                  const name = asset.displayProps?.label ?? ''
                  const groupId = asset.groupId
                  const type = asset.type
                  const assetId = toAssetId({
                    chainId:
                      ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[asset.network as SupportedZapperNetwork],
                    assetNamespace: 'erc20', // TODO(gomes): this might break for native assets, is that a thing?,
                    assetReference: asset.address,
                  })

                  if (!acc.metadataByProvider[appName]) {
                    acc.metadataByProvider[appName] = {
                      provider: appName,
                      icon: appImage,
                      color: '#000000', // TODO
                      url:
                        appId && maybeZapperV2AppsData.data
                          ? maybeZapperV2AppsData.data[appId]?.url
                          : '',
                    }
                  }
                  // TODO(gomes): ensure this works with the heuristics of ContractPosition vs AppToken
                  const underlyingAssetIds = asset.tokens.map(token => {
                    const underlyingAssetId = toAssetId({
                      chainId:
                        ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[token.network as SupportedZapperNetwork],
                      assetNamespace: 'erc20', // TODO(gomes): this might break for native assets, is that a thing?,
                      assetReference: token.address,
                    })
                    return underlyingAssetId
                  }) as unknown as AssetIdsTuple

                  // An "AppToken" is a position represented a token, thus it is what we call an underlyingAssetId i.e UNI LP AssetId
                  const underlyingAssetId =
                    asset.type === 'app-token' ? assetId : underlyingAssetIds[0]!

                  // Upsert underlyingAssetIds if they don't exist in store
                  underlyingAssetIds.forEach((underlyingAssetId, i) => {
                    if (!assets[underlyingAssetId]) {
                      const underlyingAsset = makeAsset({
                        assetId: underlyingAssetId,
                        symbol: asset.tokens[i].symbol,
                        // No dice here, there's no name property
                        name: asset.tokens[i].symbol,
                        precision: asset.tokens[i].decimals,
                        icon: asset.displayProps?.images[i] ?? '',
                      })

                      // TODO(gomes): we might want to do this in a batch
                      dispatch(assetsSlice.actions.upsertAsset(underlyingAsset))
                    }
                  })

                  // Upsert underlyingAssetId if it doesn't exist in store
                  if (asset.type === 'app-token' && !assets[underlyingAssetId]) {
                    const underlyingAsset = makeAsset({
                      assetId: underlyingAssetId,
                      symbol: asset.symbol ?? '',
                      name: asset.displayProps?.label ?? '',
                      precision: asset.decimals ?? 18,
                      icons: asset.displayProps?.images ?? [],
                    })
                    dispatch(assetsSlice.actions.upsertAsset(underlyingAsset))
                  }

                  const underlyingAssetRatiosBaseUnit = (() => {
                    // TODO(gomes): Scrutinize whether or not this generalizes to all products
                    // Not all app-token products are created equal
                    if (asset.type === 'app-token') {
                      const token0ReservesCryptoPrecision = asset.dataProps?.reserves?.[0]
                      const token1ReservesCryptoPrecision = asset.dataProps?.reserves?.[1]
                      const token0ReservesBaseUnit =
                        typeof token0ReservesCryptoPrecision === 'number'
                          ? bnOrZero(
                              bnOrZero(
                                bnOrZero(token0ReservesCryptoPrecision.toFixed()).toString(),
                              ),
                            ).times(bn(10).pow(asset.decimals ?? 18))
                          : undefined
                      const token1ReservesBaseUnit =
                        typeof token1ReservesCryptoPrecision === 'number'
                          ? bnOrZero(
                              bnOrZero(
                                bnOrZero(token1ReservesCryptoPrecision.toFixed()).toString(),
                              ),
                            ).times(bn(10).pow(asset.decimals ?? 18))
                          : undefined
                      const totalSupplyBaseUnit =
                        typeof asset.supply === 'number'
                          ? bnOrZero(asset.supply)
                              .times(bn(10).pow(asset.decimals ?? 18))
                              .toString()
                          : undefined
                      const token0PoolRatio =
                        token0ReservesBaseUnit && totalSupplyBaseUnit
                          ? token0ReservesBaseUnit.div(totalSupplyBaseUnit).toString()
                          : undefined
                      const token1PoolRatio =
                        token1ReservesBaseUnit && totalSupplyBaseUnit
                          ? token1ReservesBaseUnit.div(totalSupplyBaseUnit).toString()
                          : undefined

                      if (!(token0PoolRatio && token1PoolRatio)) return

                      return [
                        toBaseUnit(token0PoolRatio.toString(), asset.tokens[0].decimals),
                        toBaseUnit(token1PoolRatio.toString(), asset.tokens[1].decimals),
                      ] as const
                    }
                  })()

                  if (!acc.opportunities[assetId]) {
                    acc.opportunities[assetId] = {
                      apy,
                      assetId,
                      underlyingAssetId,
                      underlyingAssetIds,
                      underlyingAssetRatiosBaseUnit: underlyingAssetRatiosBaseUnit ?? ['0', '0'],
                      // TODO(gomes): one AssetId can be an active opportunity across many, we will want to serialize this.
                      id: assetId as OpportunityId,
                      icon,
                      name,
                      // TODO
                      rewardAssetIds: [],
                      provider: appName,
                      tvl,
                      type:
                        groupId === 'farm' || type === 'contract-position'
                          ? DefiType.Staking
                          : DefiType.LiquidityPool,
                      // TODO(gomes) We should either:
                      // 1. filter out the opportunities that are part of our existing view-layer abstraction
                      // 2. support the opportunities that are part of our existing view-layer abstraction, and fetch them here exclusively instead
                      // Will need to spike if the available data is sufficient once we smoosh zapper and Zerion data
                      isClaimableRewards: false,
                      isReadOnly: true,
                    }
                  }
                  return {
                    accountId,
                    provider: appName,
                    opportunityId: assetId,
                    stakedAmountCryptoBaseUnit,
                    fiatAmount,
                    // TODO: This assumes all as staking for now. We will need to handle LP as well.
                    type: DefiType.Staking,
                  }
                })
                .filter(isSome)

              acc.userData = acc.userData.concat(appAccountOpportunities)
              return acc
            },
            { userData: [], opportunities: {}, metadataByProvider: {} },
          )
          return { data: parsedOpportunities }
        } catch (e) {
          moduleLogger.warn(e, 'getZapperAppsbalancesOutput')

          const message = e instanceof Error ? e.message : 'Error fetching read-only opportunities'
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

export const { useGetZapperNftUserTokensQuery, useGetZapperCollectionsQuery } = zapperApi
export const { useGetZapperAppsBalancesOutputQuery } = zapper

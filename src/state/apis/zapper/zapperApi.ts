import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAssetId, toAccountId, toAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { WETH_TOKEN_CONTRACT_ADDRESS } from 'contracts/constants'
import qs from 'qs'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { assets as assetsSlice, makeAsset } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { opportunities } from 'state/slices/opportunitiesSlice/opportunitiesSlice'
import type {
  AssetIdsTuple,
  DefiProviderMetadata,
  GetOpportunityMetadataOutput,
  GetOpportunityUserDataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunityMetadataBase,
  ReadOnlyOpportunityType,
  StakingId,
} from 'state/slices/opportunitiesSlice/types'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId } from 'state/slices/opportunitiesSlice/utils'
import { selectFeatureFlag } from 'state/slices/preferencesSlice/selectors'

import { parseToNftItem } from '../nft/parsers/zapper'
import type { NftCollectionType, NftItemWithCollection } from '../nft/types'
import { accountIdsToEvmAddresses } from '../nft/utils'
import type {
  SupportedZapperNetwork,
  V2AppResponseType,
  V2NftBalancesCollectionsResponseType,
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
  zapperAssetToMaybeAssetId,
  ZapperGroupId,
  zapperNetworkToChainId,
} from './validators'

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

type GetZapperAppsBalancesInput = void // void in the interim, but should eventually be consumed programatically so we are reactive on accounts
// {
// accountIds: AccountId[]
// }

type GetZapperCollectionsInput = {
  accountIds: AccountId[]
  collectionId: string
}

export type GetZapperAppsBalancesOutput = {
  userData: ReadOnlyOpportunityType[]
  opportunities: Record<string, OpportunityMetadataBase>
  metadataByProvider: Record<string, DefiProviderMetadata>
}

// https://docs.zapper.xyz/docs/apis/getting-started
export const zapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'zapperApi',
  endpoints: build => ({
    getZapperAppsOutput: build.query<Record<string, V2AppResponseType>, void>({
      queryFn: async () => {
        const url = `/v2/apps`
        const payload = { ...options, headers, url }
        const { data: res } = await axios.request({ ...payload })
        try {
          const parsedZapperV2AppsData = V2AppsResponse.parse(res)

          const zapperV2AppsDataByAppId = parsedZapperV2AppsData.reduce<
            Record<string, V2AppResponseType>
          >(
            (acc, app) => Object.assign(acc, { [app.id]: app }),
            {} as Record<string, V2AppResponseType>,
          )

          return { data: zapperV2AppsDataByAppId }
        } catch (e) {
          console.error(e)

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
        const url = `/v2/apps/uniswap-v2/tokens`
        const params = {
          groupId: ZapperGroupId.Pool,
          networks: evmNetworks,
        }
        const payload = { ...options, params, headers, url }
        const { data: res } = await axios.request({ ...payload })
        const zapperV2AppTokensData = V2AppTokensResponse.parse(res)

        const assets = selectAssets(getState() as ReduxState)

        const { assets: zapperAssets, data } = zapperV2AppTokensData.reduce<{
          assets: AssetsState
          data: GetZapperAppTokensOutput
        }>(
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

            acc.data[assetId] = appTokenData

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

            if (!(appTokenData.decimals && appTokenData.symbol)) return acc

            acc.assets.byId[assetId] = makeAsset({
              assetId,
              symbol: appTokenData.symbol,
              // WETH should be displayed as ETH in the UI due to the way UNI-V2 works
              // ETH is used for depositing/withdrawing, but WETH is used under the hood
              name,
              precision: appTokenData.decimals,
              icons,
            })
            acc.assets.ids.push(assetId)
            return acc
          },
          { assets: { byId: {}, ids: [] }, data: {} },
        )

        dispatch(assetsSlice.actions.upsertAssets(zapperAssets))

        return { data }
      },
    }),
    getZapperNftUserTokens: build.query<NftItemWithCollection[], GetZapperNftUserTokensInput>({
      queryFn: async ({ accountIds }) => {
        let data: (V2NftUserItem & { ownerAddress: string })[] = []

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
              if (res?.items?.length)
                data = data.concat(
                  res.items.map(item => Object.assign(item, { ownerAddress: userAddress })),
                )
              if (res?.items?.length < limit) break
            } catch (e) {
              console.error(e)
              break
            }
          }
        }

        const parsedData = data.map(v2NftItem => {
          // Actually defined since we're passing supported EVM networks AccountIds
          const chainId = zapperNetworkToChainId(
            v2NftItem.token.collection.network as SupportedZapperNetwork,
          )!
          return parseToNftItem(v2NftItem, chainId)
        })
        return { data: parsedData }
      },
    }),
    // We abuse the /v2/nft/balances/collections endpoint to get the collection meta
    getZapperCollectionBalance: build.query<NftCollectionType, GetZapperCollectionsInput>({
      queryFn: async ({ accountIds, collectionId }) => {
        const addresses = accountIdsToEvmAddresses(accountIds)
        const params = {
          'addresses[]': addresses,
          'collectionAddresses[]': [fromAssetId(collectionId).assetReference],
        }
        const url = `/v2/nft/balances/collections`
        const payload = { ...options, params, headers, url }
        const { data } = await axios.request<V2NftBalancesCollectionsResponseType>({
          ...payload,
        })

        const { items: validatedData } = V2NftBalancesCollectionsResponse.parse(data)

        const parsedData: NftCollectionType[] = validatedData.map(item => {
          const chainId = zapperNetworkToChainId(item.collection.network as SupportedZapperNetwork)!
          return {
            assetId: collectionId,
            // Actually defined since we're passing supported EVM networks AccountIds
            chainId,
            name: item.collection.name,
            floorPrice: item.collection.floorPriceEth || '',
            openseaId: item.collection.openseaId || '',
            description: item.collection.description,
            socialLinks: item.collection.socialLinks.map(link => ({
              key: link.name,
              displayName: link.label,
              url: link.url,
            })),
          }
        })

        if (!parsedData[0]) {
          return {
            error: {
              status: 404,
              code: 'ZAPPER_COLLECTION_NOT_FOUND',
              message: 'Collection not found',
            },
          }
        }

        return { data: parsedData[0] }
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
      GetZapperAppsBalancesInput
    >({
      queryFn: async (_input, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const ReadOnlyAssets = selectFeatureFlag(state, 'ReadOnlyAssets')

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

        const accountIds = selectWalletAccountIds(state)

        const assets = selectAssets(state)
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

              // Avoids duplicates from out full-fledged opportunities
              // Note, this assumes our DefiProvider value is the same as the AppName
              if (Object.values(DefiProvider).includes(appName as DefiProvider)) {
                return acc
              }

              const appImage = appAccountBalance.appImage
              const accountId = toAccountId({
                chainId:
                  ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[
                    appAccountBalance.network as SupportedZapperNetwork
                  ],
                account: appAccountBalance.address,
              })

              const appAccountOpportunities = appAccountBalance.products
                .flatMap(({ assets, label }) =>
                  assets.map(asset => Object.assign(asset, { label })),
                )
                .map<ReadOnlyOpportunityType | undefined>(asset => {
                  const stakedAmountCryptoBaseUnitAccessor = (() => {
                    //  Liquidity Pool of sorts
                    const maybeLpAcesssor = asset.tokens.find(
                      token => token.metaType === 'supplied' || token.metaType === 'borrowed',
                    )
                    // More general single-sided staking
                    if (maybeLpAcesssor?.balanceRaw) return maybeLpAcesssor
                    return asset
                  })()
                  // The balance itself is a positive amount, but the USD balance is negative, so we need to check for that
                  const isNegativeStakedAmount = bnOrZero(
                    stakedAmountCryptoBaseUnitAccessor?.balanceUSD,
                  ).isNegative()
                  const stakedAmountCryptoBaseUnitBase = bnOrZero(
                    stakedAmountCryptoBaseUnitAccessor?.balanceRaw,
                  )
                  const stakedAmountCryptoBaseUnit = (
                    isNegativeStakedAmount
                      ? stakedAmountCryptoBaseUnitBase.negated()
                      : stakedAmountCryptoBaseUnitBase
                  ).toFixed()
                  const rewardTokens = asset.tokens.filter(token => token.metaType === 'claimable')
                  const rewardAssetIds = rewardTokens.reduce<AssetId[]>((acc, token) => {
                    const rewardAssetId = zapperAssetToMaybeAssetId(token)
                    // Reward AssetIds are ordered - if we can't get all of them, we return empty rewardAssetIds
                    if (!rewardAssetId) return []

                    acc.push(rewardAssetId)
                    return acc
                  }, []) as unknown as AssetIdsTuple

                  // Upsert rewardAssetIds if they don't exist in store
                  const rewardAssetsToUpsert = rewardTokens.reduce<AssetsState>(
                    (acc, token, i) => {
                      const rewardAssetId = zapperAssetToMaybeAssetId(token)
                      if (!rewardAssetId) return acc
                      if (assets[rewardAssetId]) return acc

                      acc.byId[rewardAssetId] = makeAsset({
                        assetId: rewardAssetId,
                        symbol: token.symbol,
                        // No dice here, there's no name property
                        name: token.symbol,
                        precision: token.decimals,
                        icon: token.displayProps?.images[i] ?? '',
                      })
                      acc.ids = acc.ids.concat(rewardAssetId)

                      return acc
                    },
                    { byId: {}, ids: [] },
                  )

                  const maybeTopLevelRewardAssetToUpsert: AssetsState = (() => {
                    const rewardAssetId =
                      asset.groupId === 'claimable' ? zapperAssetToMaybeAssetId(asset) : undefined
                    return {
                      byId: rewardAssetId
                        ? {
                            [rewardAssetId]: makeAsset({
                              assetId: rewardAssetId,
                              symbol: asset.tokens[0].symbol ?? '',
                              name: asset.displayProps?.label ?? '',
                              precision: bnOrZero(asset.decimals).toNumber(),
                              icon: asset.displayProps?.images[0] ?? '',
                            }),
                          }
                        : {},
                      ids: rewardAssetId ? [rewardAssetId] : [],
                    }
                  })()

                  dispatch(assetsSlice.actions.upsertAssets(rewardAssetsToUpsert))
                  dispatch(assetsSlice.actions.upsertAssets(maybeTopLevelRewardAssetToUpsert))

                  const rewardsCryptoBaseUnit = {
                    amounts: rewardTokens.map(token => token.balanceRaw),
                    claimable: true,
                  } as unknown as ReadOnlyOpportunityType['rewardsCryptoBaseUnit']

                  const fiatAmount = bnOrZero(asset.balanceUSD).toString()
                  const apy = bnOrZero(asset.dataProps?.apy).div(100).toString()
                  const tvl = bnOrZero(asset.dataProps?.liquidity).toString()
                  const icon = asset.displayProps?.images?.[0] ?? ''
                  const name = asset.displayProps?.label ?? ''

                  // Assume all as staking. Zapper's heuristics simply don't allow us to discriminate
                  // This is our best bet until we bring in the concept of an "DefiType.GenericOpportunity"
                  const defiType = DefiType.Staking

                  const topLevelAsset = (() => {
                    const maybeLpAsset = asset.tokens.find(
                      token => token.metaType === 'supplied' || token.metaType === 'borrowed',
                    )
                    if (maybeLpAsset) return maybeLpAsset
                    return asset
                  })()

                  const assetId = zapperAssetToMaybeAssetId(topLevelAsset)

                  if (!assetId) return undefined

                  const opportunityId: StakingId = `${asset.address}#${asset.key}`

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
                  const underlyingAssetIds = asset.tokens.map(token => {
                    const underlyingAssetId = zapperAssetToMaybeAssetId(token)
                    return underlyingAssetId!
                  }) as unknown as AssetIdsTuple

                  const assetMarketData = selectMarketDataById(state, assetId)
                  const assetPrice =
                    // Claimable assets may not have a price, if that's the case, we use the price of the underlying asset they wrap
                    asset.groupId === 'claimable'
                      ? bnOrZero(asset.tokens[0].price).toNumber()
                      : asset.price
                  if (assetMarketData.price === '0' && assetPrice) {
                    dispatch(
                      marketDataSlice.actions.setCryptoMarketData({
                        [assetId]: {
                          price: bnOrZero(assetPrice).toString(),
                          marketCap: '0',
                          volume: bnOrZero(asset.dataProps?.volume).toString(),
                          changePercent24Hr: 0,
                        },
                      }),
                    )
                  }

                  underlyingAssetIds.forEach((underlyingAssetId, i) => {
                    const marketData = selectMarketDataById(state, underlyingAssetId)
                    if (marketData.price === '0') {
                      dispatch(
                        marketDataSlice.actions.setCryptoMarketData({
                          [underlyingAssetId]: {
                            price: bnOrZero(asset.tokens[i].price).toString(),
                            marketCap: '0',
                            volume: bnOrZero(asset.tokens[i].dataProps?.volume).toString(),
                            changePercent24Hr: 0,
                          },
                        }),
                      )
                    }
                  })

                  const underlyingAssetId =
                    asset.type === 'app-token' || asset.groupId === 'claimable'
                      ? assetId
                      : underlyingAssetIds[0]!

                  // Upsert underlyingAssetIds if they don't exist in store
                  const underlyingAssetsToUpsert = Object.values(
                    underlyingAssetIds,
                  ).reduce<AssetsState>(
                    (acc, underlyingAssetId, i) => {
                      if (assets[underlyingAssetId]) return acc

                      acc.byId[underlyingAssetId] = makeAsset({
                        assetId: underlyingAssetId,
                        symbol: asset.tokens[i].symbol,
                        // No dice here, there's no name property
                        name: asset.tokens[i].symbol,
                        precision: asset.tokens[i].decimals,
                        icon: asset.displayProps?.images[i] ?? '',
                      })
                      acc.ids = acc.ids.concat(underlyingAssetId)

                      return acc
                    },
                    { byId: {}, ids: [] },
                  )

                  dispatch(assetsSlice.actions.upsertAssets(underlyingAssetsToUpsert))

                  // Upsert underlyingAssetIds if they don't exist in store
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

                  const underlyingAssetRatiosBaseUnit = (asset.dataProps?.reserves ?? []).map(
                    (reserve, i) => {
                      const reserveBaseUnit = toBaseUnit(reserve, asset.decimals ?? 18)
                      const totalSupplyBaseUnit =
                        typeof asset.supply === 'number'
                          ? toBaseUnit(asset.supply, asset.decimals ?? 18)
                          : undefined
                      const tokenPoolRatio = totalSupplyBaseUnit
                        ? bn(reserveBaseUnit).div(totalSupplyBaseUnit).toString()
                        : undefined
                      if (bnOrZero(tokenPoolRatio).isZero()) return '0'
                      const ratio = toBaseUnit(tokenPoolRatio, asset.tokens[i].decimals)
                      return ratio
                    },
                  )

                  if (!acc.opportunities[opportunityId]) {
                    acc.opportunities[opportunityId] = {
                      apy,
                      assetId,
                      underlyingAssetId,
                      underlyingAssetIds,
                      underlyingAssetRatiosBaseUnit,
                      id: opportunityId,
                      icon,
                      name,
                      rewardAssetIds,
                      provider: appName,
                      tvl,
                      type: defiType,
                      version: asset.label,
                      group: asset.groupId,
                      isClaimableRewards: Boolean(rewardTokens.length),
                      isReadOnly: true,
                    }
                  }

                  return {
                    accountId,
                    provider: appName,
                    userStakingId: serializeUserStakingId(accountId, opportunityId),
                    opportunityId,
                    stakedAmountCryptoBaseUnit,
                    rewardsCryptoBaseUnit,
                    fiatAmount,
                    label: asset.groupId,
                    type: defiType,
                    version: asset.label,
                  }
                })
                .filter(isSome)

              acc.userData = acc.userData.concat(appAccountOpportunities)
              return acc
            },
            { userData: [], opportunities: {}, metadataByProvider: {} },
          )

          // Upsert metadata
          const readOnlyMetadata = parsedOpportunities.opportunities
          const readOnlyUserData = parsedOpportunities.userData
          // Prepare the payload for accounts upsertion
          const accountUpsertPayload: GetOpportunityUserDataOutput = {
            byAccountId: {},
            type: DefiType.Staking,
          }
          // Prepare the payload for user staking upsertion
          const userStakingUpsertPayload: GetOpportunityUserStakingDataOutput = {
            byId: {},
          }
          // Prepare the payloads for upsertOpportunityMetadata
          const stakingMetadataUpsertPayload: GetOpportunityMetadataOutput = {
            byId: {},
            type: DefiType.Staking,
          }

          // Populate read only metadata payload
          for (const id in readOnlyMetadata) {
            stakingMetadataUpsertPayload.byId[id] = readOnlyMetadata[id]
          }

          // Populate read only userData payload
          for (const opportunity of readOnlyUserData) {
            const {
              accountId,
              opportunityId,
              userStakingId,
              rewardsCryptoBaseUnit,
              stakedAmountCryptoBaseUnit,
            } = opportunity

            // Prepare payload for upsertOpportunityAccounts
            if (accountId) {
              if (!accountUpsertPayload.byAccountId[accountId]) {
                accountUpsertPayload.byAccountId[accountId] = []
              }
              // Here we push the opportunityId (representing StakingId) instead of userStakingId
              accountUpsertPayload.byAccountId[accountId]!.push(opportunityId)
            }

            // Prepare payload for upsertUserStakingOpportunities
            if (userStakingId) {
              userStakingUpsertPayload.byId[userStakingId] = {
                stakedAmountCryptoBaseUnit,
                rewardsCryptoBaseUnit,
                userStakingId,
              }
            }
          }

          dispatch(opportunities.actions.upsertOpportunitiesMetadata(stakingMetadataUpsertPayload))
          dispatch(opportunities.actions.upsertOpportunityAccounts(accountUpsertPayload))
          dispatch(opportunities.actions.upsertUserStakingOpportunities(userStakingUpsertPayload))

          // Denormalized into userData/opportunities/metadataByProvider for ease of consumption if we need to
          return { data: parsedOpportunities }
        } catch (e) {
          console.error(e)

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

export const { useGetZapperNftUserTokensQuery } = zapperApi

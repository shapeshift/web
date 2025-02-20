import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethChainId, toAccountId, toAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds, MarketData } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId, makeAsset } from '@shapeshiftoss/utils'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import qs from 'qs'
import { zeroAddress } from 'viem'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type {
  GetPlatformsResponse,
  GetTokensResponse,
  Platform,
  TokenInfo,
} from 'lib/portals/types'
import { isSome } from 'lib/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'
import type { UpsertAssetsPayload } from 'state/slices/assetsSlice/assetsSlice'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { foxEthLpAssetIds } from 'state/slices/opportunitiesSlice/constants'
import { opportunities } from 'state/slices/opportunitiesSlice/opportunitiesSlice'
import type {
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

import { accountIdsToEvmAddresses } from '../nft/utils'
import type { PortalsAssetBase, SupportedPortalsNetwork, V2AppResponseType } from './validators'
import {
  chainIdToPortalsNetwork,
  PORTALS_NETWORKS_TO_CHAIN_ID_MAP,
  portalsNetworkToChainId,
} from './validators'

const PORTALS_BASE_URL = getConfig().REACT_APP_PORTALS_BASE_URL
const PORTALS_API_KEY = getConfig().REACT_APP_PORTALS_API_KEY

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

export type GetPortalsAppsBalancesInput = {
  evmAccountIds: AccountId[]
}

export type GetPortalsAppsBalancesOutput = {
  userData: ReadOnlyOpportunityType[]
  opportunities: Record<string, OpportunityMetadataBase>
  metadataByProvider: Record<string, DefiProviderMetadata>
}

type PortalsBalance = {
  key: string
  name: string
  decimals: number
  symbol: string
  price: number
  address: string
  platform: string
  network: string
  images?: string[]
  image?: string
  tokens?: string[]
  liquidity: number
  metrics?: {
    apy?: string
    baseApy?: string
    volumeUsd1d?: string
  }
  metadata?: {
    tags?: string[]
  }
  reserves?: string[]
  totalSupply?: string
  balanceUSD: number
  balance: number
  rawBalance: string
}

type PortalsAccountResponse = {
  totalQueried: number
  balances: PortalsBalance[]
}

export const portalsApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'portalsApi',
  endpoints: build => ({
    getPortalsAppsOutput: build.query<Record<string, V2AppResponseType>, void>({
      queryFn: async () => {
        try {
          if (!PORTALS_BASE_URL) throw new Error('REACT_APP_PORTALS_BASE_URL not set')
          if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')

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
          if (!PORTALS_BASE_URL) throw new Error('REACT_APP_PORTALS_BASE_URL not set')
          if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')

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
                appId: DefiProvider.UniV2,
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
    getPortalsAppsBalancesOutput: build.query<
      GetPortalsAppsBalancesOutput,
      GetPortalsAppsBalancesInput
    >({
      queryFn: async ({ evmAccountIds }, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const DynamicLpAssets = selectFeatureFlag(state, 'DynamicLpAssets')
        const ReadOnlyAssets = selectFeatureFlag(state, 'ReadOnlyAssets')

        try {
          if (!ReadOnlyAssets || !evmAccountIds.length)
            return {
              data: {
                userData: [],
                opportunities: {},
                metadataByProvider: {},
              },
            }

          if (!PORTALS_BASE_URL) throw new Error('REACT_APP_PORTALS_BASE_URL not set')
          if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')

          const assets = selectAssets(state)
          const evmNetworks = evmChainIds.map(chainIdToPortalsNetwork).filter(isSome)

          // Get unique addresses set from EVM AccountIds
          const addresses = accountIdsToEvmAddresses(evmAccountIds)

          // Make parallel requests for each address
          const accountResponses = await Promise.all(
            addresses.map(async address => {
              const url = `${PORTALS_BASE_URL}/v2/account`
              const params = {
                owner: address,
                networks: evmNetworks,
              }

              const { data: res } = await axios.get<PortalsAccountResponse>(url, {
                headers: {
                  Authorization: `Bearer ${PORTALS_API_KEY}`,
                },
                params,
              })
              return { address, data: res }
            }),
          )

          type AccumulatorType = {
            userData: ReadOnlyOpportunityType[]
            opportunities: Record<string, OpportunityMetadataBase>
            metadataByProvider: Record<string, DefiProviderMetadata>
          }

          const parsedOpportunities = accountResponses.reduce<AccumulatorType>(
            (acc: AccumulatorType, { address, data: res }) => {
              const balances = res.balances
                .filter(balance => {
                  // Only filter out basic/native tokens at the top level, but allow them as underlying assets
                  if (balance.metadata?.tags?.[0] === '#pool') return true
                  return !['basic', 'native'].includes(balance.platform)
                })
                .reduce<AccumulatorType>(
                  (balanceAcc: AccumulatorType, balance: PortalsBalance) => {
                    const appName =
                      balance.platform === 'uniswapv2' ? DefiProvider.UniV2 : balance.platform

                    // Avoids duplicates from our full-fledged opportunities
                    if (Object.values(DefiProvider).includes(appName as DefiProvider)) {
                      if (appName !== DefiProvider.UniV2) return balanceAcc
                    }

                    const appImage = balance.image ?? balance.images?.[0] ?? ''
                    const accountId = toAccountId({
                      chainId:
                        PORTALS_NETWORKS_TO_CHAIN_ID_MAP[
                          balance.network as SupportedPortalsNetwork
                        ],
                      account: address,
                    })

                    const chainId = portalsNetworkToChainId(
                      balance.network as SupportedPortalsNetwork,
                    )
                    if (!chainId) return balanceAcc

                    const assetId = toAssetId({
                      chainId,
                      assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                      assetReference: balance.address,
                    })

                    if (balance.platform === 'uniswapv2' && !DynamicLpAssets) return balanceAcc

                    const stakedAmountCryptoBaseUnit = balance.rawBalance
                    const fiatAmount = bnOrZero(balance.balanceUSD).toString()
                    const apy = bnOrZero(balance.metrics?.apy ?? balance.metrics?.baseApy ?? 0)
                      .div(100)
                      .toString()
                    const tvl = bnOrZero(balance.liquidity).toString()
                    const icon = balance.image ?? balance.images?.[0] ?? ''
                    const name = balance.name

                    // Use #pool tag to determine if this is an LP token
                    const isLpToken = balance.metadata?.tags?.includes('#pool')
                    const defiType = isLpToken ? DefiType.LiquidityPool : DefiType.Staking

                    const opportunityId: StakingId = `${balance.address}#${balance.key}`

                    if (!balanceAcc.metadataByProvider[appName]) {
                      balanceAcc.metadataByProvider[appName] = {
                        provider: appName,
                        icon: appImage,
                        color: '#000000',
                      }
                    }

                    const tokens = balance.tokens ?? []
                    const underlyingAssetIds = tokens.map(tokenAddress =>
                      toAssetId({
                        chainId,
                        assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                        assetReference: tokenAddress as string,
                      }),
                    )

                    const assetMarketData = selectMarketDataByAssetIdUserCurrency(state, assetId)
                    if (assetMarketData.price === '0' && balance.price) {
                      dispatch(
                        marketDataSlice.actions.setCryptoMarketData({
                          [assetId]: {
                            price: bnOrZero(balance.price).toString(),
                            marketCap: '0',
                            volume: bnOrZero(balance.metrics?.volumeUsd1d).toString(),
                            changePercent24Hr: 0,
                          },
                        }),
                      )
                    }

                    // Create or update the asset if it doesn't exist
                    if (!assets[assetId]) {
                      const icons = [...(balance.images ?? []), balance.image].filter(isSome)
                      const asset = makeAsset(assets, {
                        assetId,
                        symbol: balance.symbol,
                        name: balance.name,
                        precision: balance.decimals,
                        icons,
                      })
                      dispatch(assetsSlice.actions.upsertAsset(asset))
                    }

                    const reserves = balance.reserves ?? []
                    const totalSupply = balance.totalSupply ? bnOrZero(balance.totalSupply) : bn(1)

                    const underlyingAssetRatiosBaseUnit = reserves
                      .filter(reserve => reserve !== undefined && reserve !== null)
                      .map((reserve, i) => {
                        const tokenAddress = balance.tokens?.[i]
                        if (!tokenAddress) return '0'

                        const underlyingAssetId = underlyingAssetIds[i]
                        if (!underlyingAssetId) return '0'

                        const underlyingAsset = assets[underlyingAssetId]
                        if (!underlyingAsset) return '0'

                        // Calculate ratio of reserve to total supply
                        const reserveAmount = bnOrZero(reserve)
                        const ratio = reserveAmount.div(bnOrZero(totalSupply))

                        // Convert ratio to base unit
                        return toBaseUnit(ratio.toString(), underlyingAsset.precision)
                      }) as readonly string[]

                    if (!balanceAcc.opportunities[opportunityId]) {
                      balanceAcc.opportunities[opportunityId] = {
                        apy,
                        assetId,
                        underlyingAssetId: assetId,
                        underlyingAssetIds,
                        underlyingAssetRatiosBaseUnit,
                        id: opportunityId,
                        icon,
                        name,
                        rewardAssetIds: [], // Portals doesn't provide reward info
                        provider: appName,
                        tvl,
                        type: defiType,
                        group: balance.metadata?.tags?.[0]?.replace('#', '') ?? '',
                        isClaimableRewards: false,
                        isReadOnly: appName !== DefiProvider.UniV2, // Only mark non-UniV2 opportunities as read-only
                      }
                    }

                    const opportunity: ReadOnlyOpportunityType = {
                      accountId,
                      provider: appName,
                      userStakingId: serializeUserStakingId(accountId, opportunityId),
                      opportunityId,
                      stakedAmountCryptoBaseUnit,
                      rewardsCryptoBaseUnit: {
                        amounts: [] as readonly [],
                        claimable: false,
                      },
                      fiatAmount,
                    }

                    balanceAcc.userData.push(opportunity)
                    return balanceAcc
                  },
                  {
                    userData: acc.userData,
                    opportunities: acc.opportunities,
                    metadataByProvider: acc.metadataByProvider,
                  },
                )

              return {
                userData: [...acc.userData, ...balances.userData],
                opportunities: { ...acc.opportunities, ...balances.opportunities },
                metadataByProvider: { ...acc.metadataByProvider, ...balances.metadataByProvider },
              }
            },
            { userData: [], opportunities: {}, metadataByProvider: {} },
          )

          const tokensDataToFetch = new Set<string>()

          // Collect all tokens needing data from all account responses
          accountResponses.forEach(({ data: res }) => {
            res.balances.forEach(balance => {
              const network = balance.network as SupportedPortalsNetwork
              const chainId = portalsNetworkToChainId(network)
              if (!chainId) return

              // Check LP token
              const assetId = toAssetId({
                chainId,
                assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                assetReference: balance.address,
              })

              // Add if missing from assets OR has zero market data, and not zero address
              const asset = assets[assetId]
              const marketData = selectMarketDataByAssetIdUserCurrency(state, assetId)
              if (
                (!asset || marketData.price === '0') &&
                balance.platform !== 'native' &&
                balance.address.toLowerCase() !== zeroAddress
              ) {
                tokensDataToFetch.add(`${network}:${balance.address}`)
              }

              // Check underlying tokens
              balance.tokens?.forEach(tokenAddress => {
                // Skip zero address tokens
                if (tokenAddress.toLowerCase() === zeroAddress) return

                const underlyingAssetId = toAssetId({
                  chainId,
                  assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                  assetReference: tokenAddress,
                })

                const underlyingAsset = assets[underlyingAssetId]
                const underlyingMarketData = selectMarketDataByAssetIdUserCurrency(
                  state,
                  underlyingAssetId,
                )

                // Include all non-zero-address tokens that need data
                if (!underlyingAsset || underlyingMarketData.price === '0') {
                  tokensDataToFetch.add(`${network}:${tokenAddress}`)
                }
              })
            })
          })

          // Fetch all token data in one request
          const tokenData =
            tokensDataToFetch.size > 0
              ? (
                  await axios.get<{ tokens: TokenInfo[] }>(`${PORTALS_BASE_URL}/v2/tokens`, {
                    headers: { Authorization: `Bearer ${PORTALS_API_KEY}` },
                    params: { ids: [...tokensDataToFetch].join(',') },
                  })
                )?.data
              : undefined

          // Prepare market data upsert payload
          const marketDataUpsertPayload: Record<AssetId, MarketData> = {}

          // Process balances for market data
          accountResponses.forEach(({ data: res }) => {
            res.balances.forEach(balance => {
              const network = balance.network as SupportedPortalsNetwork
              const chainId = portalsNetworkToChainId(network)
              if (!chainId) return

              // Skip zero address
              if (balance.address.toLowerCase() === zeroAddress) return

              // LP token market data
              const lpAssetId = toAssetId({
                chainId,
                assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                assetReference: balance.address,
              })
              const lpMarketData = selectMarketDataByAssetIdUserCurrency(state, lpAssetId)

              // Find token data from the fetched data
              const lpTokenInfo = tokenData?.tokens.find(
                t =>
                  t.address.toLowerCase() === balance.address.toLowerCase() &&
                  t.network.toLowerCase() === network.toLowerCase(),
              )

              if (lpMarketData.price === '0' && (balance.price || lpTokenInfo?.price)) {
                marketDataUpsertPayload[lpAssetId] = {
                  price: bnOrZero(balance.price || lpTokenInfo?.price).toString(),
                  marketCap: bnOrZero(balance.liquidity || lpTokenInfo?.liquidity).toString(),
                  volume: bnOrZero(
                    balance.metrics?.volumeUsd1d || lpTokenInfo?.metrics?.volumeUsd1d,
                  ).toString(),
                  changePercent24Hr: 0,
                }
              }

              // Underlying tokens market data
              balance.tokens?.forEach(tokenAddress => {
                // Skip zero address tokens
                if (tokenAddress.toLowerCase() === zeroAddress) return

                const underlyingAssetId = toAssetId({
                  chainId,
                  assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                  assetReference: tokenAddress,
                })
                const underlyingMarketData = selectMarketDataByAssetIdUserCurrency(
                  state,
                  underlyingAssetId,
                )

                // Find token data from the fetched data
                const tokenInfo = tokenData?.tokens.find(
                  t =>
                    t.address.toLowerCase() === tokenAddress.toLowerCase() &&
                    t.network.toLowerCase() === network.toLowerCase(),
                )

                if (underlyingMarketData.price === '0' && tokenInfo?.price) {
                  marketDataUpsertPayload[underlyingAssetId] = {
                    price: bnOrZero(tokenInfo.price).toString(),
                    marketCap: bnOrZero(tokenInfo.liquidity).toString(),
                    volume: bnOrZero(tokenInfo.metrics?.volumeUsd1d).toString(),
                    changePercent24Hr: 0,
                  }
                }
              })
            })
          })

          // Convert tokens to assets and upsert them
          const assetsToUpsert = tokenData?.tokens.reduce<UpsertAssetsPayload>(
            (acc, token) => {
              const network = token.network as SupportedPortalsNetwork
              const chainId = portalsNetworkToChainId(network)
              if (!chainId) return acc

              const assetId = toAssetId({
                chainId,
                assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
                assetReference: token.address,
              })

              const icons = [...(token.images ?? []), token.image].filter(
                (icon): icon is string => typeof icon === 'string',
              )

              acc.byId[assetId] = makeAsset(assets, {
                assetId,
                symbol: token.symbol,
                name: token.name,
                precision: token.decimals,
                icons,
              })
              acc.ids = acc.ids.concat(assetId)

              return acc
            },
            { byId: {}, ids: [] },
          )

          if (assetsToUpsert && assetsToUpsert.ids.length > 0) {
            dispatch(assetsSlice.actions.upsertAssets(assetsToUpsert))
          }

          // Continue with existing balance processing
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

          const lpMetadataUpsertPayload: GetOpportunityMetadataOutput = {
            byId: {},
            type: DefiType.LiquidityPool,
          }

          // Populate read only metadata payload
          for (const id in readOnlyMetadata) {
            const metadata = readOnlyMetadata[id]
            if (metadata.type === DefiType.LiquidityPool) {
              lpMetadataUpsertPayload.byId[id] = metadata
            } else {
              stakingMetadataUpsertPayload.byId[id] = metadata
            }
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
              accountUpsertPayload.byAccountId[accountId]!.push(opportunityId)
            }

            // Prepare payload for upsertUserStakingOpportunities
            if (userStakingId) {
              userStakingUpsertPayload.byId[userStakingId] = {
                isLoaded: true,
                stakedAmountCryptoBaseUnit,
                rewardsCryptoBaseUnit,
                userStakingId,
              }
            }
          }

          // Make all dispatches at the end
          dispatch(opportunities.actions.upsertOpportunitiesMetadata(stakingMetadataUpsertPayload))
          dispatch(opportunities.actions.upsertOpportunitiesMetadata(lpMetadataUpsertPayload))
          dispatch(opportunities.actions.upsertOpportunityAccounts(accountUpsertPayload))
          dispatch(opportunities.actions.upsertUserStakingOpportunities(userStakingUpsertPayload))

          // Add market data upsert
          if (Object.keys(marketDataUpsertPayload).length > 0) {
            dispatch(marketDataSlice.actions.setCryptoMarketData(marketDataUpsertPayload))
          }

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

export const { useGetPortalsUniV2PoolAssetIdsQuery, useGetPortalsAppsBalancesOutputQuery } = portals

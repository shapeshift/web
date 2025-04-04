import { QueryStatus } from '@reduxjs/toolkit/query'
import { ethAssetId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import {
  ContractType,
  fetchUniV2PairData,
  getEthersProvider,
  getOrCreateContractByType,
  WETH_TOKEN_CONTRACT,
} from '@shapeshiftoss/contracts'
import type { MarketData } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { TokenAmount } from '@uniswap/sdk'
import { getAddress } from 'viem'

import { foxEthLpAssetIds } from '../../constants'
import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  LpId,
  OpportunityMetadata,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunityIdsResolverInput,
  OpportunityUserDataResolverInput,
} from '../types'
import { calculateAPRFromToken0 } from './utils'

import type { BN } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'
import { portalsApi } from '@/state/apis/portals/portalsApi'
import { selectPortalsFulfilled } from '@/state/apis/portals/selectors'
import type { ReduxState } from '@/state/reducer'
import type { AssetsState } from '@/state/slices/assetsSlice/assetsSlice'
import { selectPortfolioAccountBalancesBaseUnit } from '@/state/slices/common-selectors'
import { marketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import type { PortfolioAccountBalancesById } from '@/state/slices/portfolioSlice/portfolioSliceCommon'
import { selectPortfolioLoadingStatusGranular } from '@/state/slices/portfolioSlice/selectors'
import { selectFeatureFlags } from '@/state/slices/preferencesSlice/selectors'

let _blockNumber: number | null = null
const getBlockNumber = async () => {
  const ethersProvider = getEthersProvider(KnownChainIds.EthereumMainnet)
  if (_blockNumber) return _blockNumber
  const blockNumber = await ethersProvider.getBlockNumber()
  _blockNumber = blockNumber
  return blockNumber
}

export const uniV2LpOpportunitiesMetadataResolver = async ({
  opportunityIds,
  defiType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { dispatch, getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const { DynamicLpAssets } = selectFeatureFlags(state)

  const assets: AssetsState = state.assets

  const selectGetPortalsAppTokensOutput = portalsApi.endpoints.getPortalsAppTokensOutput.select()
  // Undefined if the DynamicLpAssets flag is off, or if Portals rugs us
  const portalsAppTokensOutput = selectGetPortalsAppTokensOutput(state)

  if (!opportunityIds?.length) {
    return Promise.resolve({
      data: {
        byId: {},
        type: defiType,
      },
    })
  }

  const lpOpportunitiesById: Record<LpId, OpportunityMetadata> = {}
  const lpMarketDataById: Record<LpId, MarketData> = {}

  const blockNumber = await getBlockNumber()

  for (const opportunityId of opportunityIds) {
    const portalsAppBalanceData = portalsAppTokensOutput.data?.[opportunityId]

    if (
      DynamicLpAssets &&
      !(portalsAppBalanceData?.tokens?.[0].decimals && portalsAppBalanceData?.tokens?.[1].decimals)
    )
      continue

    const {
      token0Decimals,
      token1Decimals,
      token0Reserves,
      token1Reserves,
      token0Address,
      token1Address,
      apr,
    } = await (async () => {
      let token0Decimals: number
      let token1Decimals: number
      let token0Reserves: BN | TokenAmount
      let token1Reserves: BN | TokenAmount
      let token0Address: string
      let token1Address: string
      let apr: string

      if (!portalsAppBalanceData) {
        const pair = await fetchUniV2PairData(opportunityId)
        token0Decimals = pair.token0.decimals
        token1Decimals = pair.token1.decimals
        token0Reserves = pair.reserve0
        token1Reserves = pair.reserve1
        token0Address = pair.token0.address
        token1Address = pair.token1.address
        apr = await calculateAPRFromToken0({
          token0Decimals,
          token0Reserves,
          blockNumber,
          pairAssetId: opportunityId,
        })

        return {
          apr,
          token0Address,
          token0Decimals,
          token0Reserves,
          token1Reserves,
          token1Address,
          token1Decimals,
        }
      }

      token0Decimals = bnOrZero(portalsAppBalanceData.tokens?.[0].decimals).toNumber()
      token1Decimals = bnOrZero(portalsAppBalanceData.tokens?.[1].decimals).toNumber()
      token0Reserves = bnOrZero(portalsAppBalanceData.dataProps?.reserves?.[0])
      token1Reserves = bnOrZero(portalsAppBalanceData.dataProps?.reserves?.[1])
      token0Address = getAddress(portalsAppBalanceData?.tokens?.[0].address ?? '')
      token1Address = getAddress(portalsAppBalanceData?.tokens?.[1].address ?? '')
      apr = bnOrZero(portalsAppBalanceData.dataProps?.apy).toFixed()
      return {
        token0Decimals,
        token1Decimals,
        token0Reserves,
        token1Reserves,
        token0Address,
        token1Address,
        apr,
      }
    })()

    const { chainId } = fromAssetId(opportunityId)
    const token0MarketData: MarketData = selectMarketDataByAssetIdUserCurrency(
      state,
      token0Address === WETH_TOKEN_CONTRACT
        ? ethAssetId
        : toAssetId({
            assetNamespace: 'erc20',
            assetReference: token0Address,
            chainId,
          }),
    )

    const assetId0 =
      // Uniswap uses ERC20 WETH under the hood, but we want to display it as ETH
      token0Address === WETH_TOKEN_CONTRACT
        ? ethAssetId
        : toAssetId({
            assetNamespace: 'erc20',
            assetReference: token0Address,
            chainId,
          })
    // Uniswap uses ERC20 WETH under the hood, but we want to display it as ETH
    const assetId1 =
      token1Address === WETH_TOKEN_CONTRACT
        ? ethAssetId
        : toAssetId({
            assetNamespace: 'erc20',
            assetReference: token1Address,
            chainId,
          })
    const underlyingAssetIds = [assetId0, assetId1]
    const underlyingAsset0 = assets.byId[underlyingAssetIds[0]]
    const underlyingAsset1 = assets.byId[underlyingAssetIds[1]]
    const lpAsset = assets.byId[opportunityId]

    if (!lpAsset) continue
    if (!(underlyingAsset0?.symbol && underlyingAsset1?.symbol)) continue

    if (bnOrZero(token0MarketData?.price).isZero()) {
      continue
    }

    const token0Price = token0MarketData.price

    const { assetReference } = fromAssetId(opportunityId)
    // Checksum
    const contractAddress = getAddress(assetReference)
    const uniV2LPContract = getOrCreateContractByType({
      address: contractAddress,
      type: ContractType.UniV2Pair,
      chainId: KnownChainIds.EthereumMainnet,
    })
    const apy = bnOrZero(apr).div(100).toString()

    // Getting the ratio of the LP token for each asset
    const totalSupplyBaseUnit =
      portalsAppBalanceData?.supply && lpAsset
        ? bnOrZero(portalsAppBalanceData.supply).times(bn(10).pow(lpAsset.precision)).toString()
        : (await uniV2LPContract.read.totalSupply()).toString()

    const token0ReservesBaseUnit = bnOrZero(
      bnOrZero(bnOrZero(token0Reserves.toFixed()).toString()),
    ).times(bn(10).pow(lpAsset.precision))
    const token1ReservesBaseUnit = bnOrZero(
      bnOrZero(bnOrZero(token1Reserves?.toFixed()).toString()),
    ).times(bn(10).pow(lpAsset.precision))
    const token0PoolRatio = token0ReservesBaseUnit.div(totalSupplyBaseUnit).toString()
    const token1PoolRatio = token1ReservesBaseUnit.div(totalSupplyBaseUnit).toString()
    // Amount of token 0 in liquidity pool
    const token0ReservesCryptoPrecision = bnOrZero(token0ReservesBaseUnit?.toString()).div(
      bn(10).pow(token0Decimals),
    )

    const totalLiquidityFiat = portalsAppBalanceData
      ? bnOrZero(portalsAppBalanceData.dataProps?.liquidity)
      : token0ReservesCryptoPrecision.times(token0Price).times(2)
    const tvl = totalLiquidityFiat.toString()
    const price = bnOrZero(tvl)
      .div(bnOrZero(totalSupplyBaseUnit.toString()).div(bn(10).pow(lpAsset.precision)))
      .toString()

    lpMarketDataById[opportunityId] = { price, marketCap: '0', volume: '0', changePercent24Hr: 0 }

    lpOpportunitiesById[opportunityId] = {
      apy,
      assetId: opportunityId,
      id: opportunityId,
      provider: DefiProvider.UniV2,
      tvl,
      type: DefiType.LiquidityPool,
      underlyingAssetId: opportunityId,
      underlyingAssetIds,
      underlyingAssetRatiosBaseUnit: [
        toBaseUnit(token0PoolRatio.toString(), token0Decimals),
        toBaseUnit(token1PoolRatio.toString(), token1Decimals),
      ] as const,
      name: `${underlyingAsset0.symbol}/${underlyingAsset1.symbol} Pool`,
      rewardAssetIds: [],
      isClaimableRewards: false,
    }
  }

  dispatch(marketData.actions.setCryptoMarketData(lpMarketDataById))

  const data = {
    byId: lpOpportunitiesById,
    type: defiType,
  }

  return { data }
}

export const uniV2LpUserDataResolver = ({
  opportunityId,
  defiType: _defiType,
  accountId,
  reduxApi,
}: OpportunityUserDataResolverInput): Promise<void> => {
  const { getState } = reduxApi
  const state: ReduxState = getState() as any
  const portfolioLoadingStatusGranular = selectPortfolioLoadingStatusGranular(state)

  // Reject RTK query if account portfolio data is granularily loading
  if (portfolioLoadingStatusGranular?.[accountId] === 'loading')
    throw new Error(`Portfolio data not loaded for ${accountId}`)

  const balances: PortfolioAccountBalancesById = selectPortfolioAccountBalancesBaseUnit(state)

  const hasPortfolioData = Boolean(balances[accountId][opportunityId])

  // Reject RTK query if there's no account portfolio data for this LP token
  if (!hasPortfolioData) {
    throw new Error('no portfolio data')
  }

  // All checks passed, resolve the promise so we continue the RTK query execution and populate LP/Account IDs
  return Promise.resolve()
}

export const uniV2LpLpOpportunityIdsResolver = ({
  reduxApi,
}: OpportunityIdsResolverInput): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState()
  const { DynamicLpAssets } = selectFeatureFlags(state)

  if (!DynamicLpAssets) return Promise.resolve({ data: [...foxEthLpAssetIds] })

  const portalsApiQueries = selectPortalsFulfilled(state)
  const uniV2AssetIds = (portalsApiQueries.find(
    query =>
      query?.endpointName === 'getPortalsUniV2PoolAssetIds' &&
      query?.status === QueryStatus.fulfilled &&
      Boolean(query?.data),
  )?.data ?? []) as LpId[]
  return Promise.resolve({ data: [...uniV2AssetIds] })
}

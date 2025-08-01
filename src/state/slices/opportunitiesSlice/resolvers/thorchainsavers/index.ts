import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { thorPoolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { isSome, toBaseUnit } from '@shapeshiftoss/utils'
import axios from 'axios'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
  OpportunityId,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import { serializeUserStakingId } from '../../utils'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
} from '../types'
import type {
  MidgardSaverResponse,
  ThorchainRunepoolInformationResponseSuccess,
  ThorchainRunepoolMemberPositionResponse,
  ThorchainRunepoolReservePositionsResponse,
} from './types'
import { getMidgardPools, getThorchainSaversPosition } from './utils'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import {
  selectLiquidityLockupTime,
  selectRunePoolMaturityTime,
} from '@/lib/utils/thorchain/selectors'
import type { ThorchainMimir } from '@/lib/utils/thorchain/types'
import { thornode } from '@/react-queries/queries/thornode'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'

export const thorchainSaversOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
  // eslint-disable-next-line require-await
}> => {
  const opportunityIds: StakingId[] = []

  if (getConfig().VITE_FEATURE_RUNEPOOL) {
    opportunityIds.push(thorchainAssetId as StakingId)
  }

  return Promise.resolve({
    data: opportunityIds,
  })
}

export const thorchainSaversStakingOpportunitiesMetadataResolver = async ({
  opportunityIds,
  defiType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { SaversVaults } = preferences.selectors.selectFeatureFlags(state)

  if (!(SaversVaults && opportunityIds?.length)) {
    return Promise.resolve({
      data: {
        byId: {},
        type: defiType,
      },
    })
  }

  const midgardPools = await getMidgardPools('7d')

  // It might be tempting to paralelize the two THOR requests - don't
  // Midgard is less reliable, so there's no point to continue the flow if this fails
  if (!midgardPools.length) {
    throw new Error('Error fetching THORChain midgard pools')
  }

  const thorchainPools = await queryClient.fetchQuery({
    ...thornode.poolsData(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Infinity staleTime as we handle halted state JIT
    staleTime: Infinity,
  })

  if (!thorchainPools.length) {
    throw new Error('Error fetching THORChain pools')
  }

  const availablePools = thorchainPools.filter(pool => pool.status === 'Available')

  const stakingOpportunitiesById: Record<StakingId, OpportunityMetadata> = {}

  for (const thorchainPool of availablePools) {
    const assetId = thorPoolAssetIdToAssetId(thorchainPool.asset)
    if (!assetId || !opportunityIds.includes(assetId as OpportunityId)) continue

    const opportunityId = assetId as StakingId

    // Thorchain is slightly different from other opportunities in that there is no contract address for the opportunity
    // The way we represent it, the opportunityId is both the opportunityId/assetId and the underlyingAssetId
    // That's an oversimplification, as this ties a native AssetId e.g btcAssetId or ethAssetId, to a Savers opportunity
    // If we were to ever support another native asset staking opportunity e.g Ethereum 2.0 consensus layer staking
    // we would need to revisit this by using generic keys as an opportunityId
    const asset = selectAssetById(state, assetId)
    const underlyingAsset = selectAssetById(state, assetId)
    const marketData = selectMarketDataByAssetIdUserCurrency(state, assetId)

    if (!asset || !underlyingAsset || !marketData) continue

    const apy = bnOrZero(
      midgardPools.find(pool => pool.asset === thorchainPool.asset)?.saversAPR,
    ).toString()
    const tvl = fromThorBaseUnit(thorchainPool.synth_supply)
      .times(bnOrZero(marketData?.price))
      .toFixed()
    const saversMaxSupplyUserCurrency = fromThorBaseUnit(
      bnOrZero(thorchainPool.synth_supply).plus(thorchainPool.synth_supply_remaining),
    )
      .times(bnOrZero(marketData?.price))
      .toFixed()

    const underlyingAssetRatioBaseUnit = bn(1).times(bn(10).pow(asset.precision)).toString()
    stakingOpportunitiesById[opportunityId] = {
      apy,
      assetId,
      id: opportunityId,
      provider: DefiProvider.ThorchainSavers,
      tvl,
      type: DefiType.Staking,
      underlyingAssetId: assetId,
      underlyingAssetIds: [assetId] as [AssetId],
      rewardAssetIds: [assetId] as [AssetId],
      // Thorchain opportunities represent a single native asset being staked, so the ratio will always be 1
      underlyingAssetRatiosBaseUnit: [underlyingAssetRatioBaseUnit],
      name: underlyingAsset.symbol,
      saversMaxSupplyFiat: saversMaxSupplyUserCurrency,
      isFull: thorchainPool.synth_mint_paused,
      isClaimableRewards: false,
    }
  }

  const thorchainAsset = selectAssetById(state, thorchainAssetId)

  if (getConfig().VITE_FEATURE_RUNEPOOL && thorchainAsset) {
    const { data: reservePositions } = await axios.get<ThorchainRunepoolReservePositionsResponse>(
      `${
        getConfig().VITE_THORCHAIN_MIDGARD_URL
      }/member/thor1dheycdevq39qlkxs2a6wuuzyn4aqxhve4qxtxt`,
    )
    const { data: runepoolInformation } =
      await axios.get<ThorchainRunepoolInformationResponseSuccess>(
        `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/runepool`,
      )

    const poolsByAssetid = thorchainPools.reduce<Record<string, ThornodePoolResponse>>(
      (acc, pool) => {
        const assetId = thorPoolAssetIdToAssetId(pool.asset)

        if (!assetId) return acc

        return {
          ...acc,
          [assetId]: pool,
        }
      },
      {},
    )

    const underlyingAssetIds = reservePositions.pools
      .map(pool => thorPoolAssetIdToAssetId(pool.pool))
      .filter(assetId => isSome(assetId)) as AssetId[]

    const totalRuneAmount = reservePositions.pools.reduce((acc, pool) => {
      const assetId = thorPoolAssetIdToAssetId(pool.pool)

      if (!assetId) return acc

      const share = bnOrZero(pool.liquidityUnits).div(poolsByAssetid[assetId].pool_units)
      const runeAmount = share.times(poolsByAssetid[assetId].balance_rune)

      return acc.plus(runeAmount)
    }, bn(0))

    const { underlyingAssetRatiosBaseUnit, underlyingAssetWeightPercentageDecimal } =
      reservePositions.pools.reduce(
        (acc, pool) => {
          const assetId = thorPoolAssetIdToAssetId(pool.pool)

          if (!assetId) return acc

          const thorchainPool = poolsByAssetid[assetId]

          if (!thorchainPool) return acc

          const share = bnOrZero(pool.liquidityUnits).div(thorchainPool.pool_units)

          const runeAmount = share.times(bnOrZero(thorchainPool.balance_rune))

          const assetAmount = share.times(thorchainPool.balance_asset)

          const poolWeightPercentageDecimal = bnOrZero(runeAmount).div(totalRuneAmount)

          const poolRatio = bnOrZero(assetAmount).div(runeAmount)

          const adjustedRatio = poolRatio.times(poolWeightPercentageDecimal)

          const asset = selectAssetById(state, assetId)

          if (!asset) return acc

          return {
            underlyingAssetRatiosBaseUnit: [
              ...acc.underlyingAssetRatiosBaseUnit,
              toBaseUnit(adjustedRatio.toFixed(), asset.precision),
            ],
            underlyingAssetWeightPercentageDecimal: [
              ...acc.underlyingAssetWeightPercentageDecimal,
              poolWeightPercentageDecimal.toFixed(),
            ],
          }
        },
        {
          underlyingAssetRatiosBaseUnit: [] as string[],
          underlyingAssetWeightPercentageDecimal: [] as string[],
        },
      )

    const runeMarketData = selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId)

    stakingOpportunitiesById[thorchainAssetId as StakingId] = {
      // RUNEPool doesn't have any APY for now
      // @TODO: calculate proper APY at opportunity meta time by doing some homemade mathematics
      apy: undefined,
      assetId: thorchainAssetId,
      id: thorchainAssetId as StakingId,
      provider: DefiProvider.ThorchainSavers,
      tvl: fromThorBaseUnit(runepoolInformation.providers.value)
        .times(bnOrZero(runeMarketData?.price))
        .toFixed(),
      type: DefiType.Staking,
      underlyingAssetId: thorchainAssetId,
      underlyingAssetIds,
      rewardAssetIds: [thorchainAssetId] as [AssetId],
      underlyingAssetRatiosBaseUnit,
      underlyingAssetWeightPercentageDecimal,
      name: thorchainAsset.symbol,
      saversMaxSupplyFiat: undefined,
      isFull: false,
      isClaimableRewards: false,
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: defiType,
  }

  return { data }
}

export const thorchainSaversStakingOpportunitiesUserDataResolver = async ({
  defiType,
  accountId,
  reduxApi,
  opportunityIds,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}
  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: defiType,
  }

  try {
    const { data: mimir } = await axios.get<ThorchainMimir>(
      `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/mimir`,
    )

    const liquidityLockupTime = selectLiquidityLockupTime(mimir)
    const runePoolDepositMaturityTime = selectRunePoolMaturityTime(mimir)

    for (const stakingOpportunityId of opportunityIds) {
      const asset = selectAssetById(state, stakingOpportunityId)
      if (!asset)
        throw new Error(`Cannot get asset for stakingOpportunityId: ${stakingOpportunityId}`)

      const userStakingId = serializeUserStakingId(accountId, stakingOpportunityId)

      const accountPosition = await getThorchainSaversPosition({
        accountId,
        assetId: stakingOpportunityId,
      })

      // No position on that pool - either it was never staked in, or fully withdrawn
      if (!accountPosition) {
        stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
          isLoaded: true,
          userStakingId,
          stakedAmountCryptoBaseUnit: '0',
          rewardsCryptoBaseUnit: { amounts: ['0'], claimable: false },
        }
        continue
      }

      const { asset_deposit_value, asset_redeem_value, asset_address } = accountPosition

      const stakedAmountCryptoBaseUnit = fromThorBaseUnit(asset_deposit_value).times(
        bn(10).pow(asset.precision),
      ) // to actual asset precision base unit

      const stakedAmountCryptoBaseUnitIncludeRewards = fromThorBaseUnit(asset_redeem_value).times(
        bn(10).pow(asset.precision),
      ) // to actual asset precision base unit

      const rewardsAmountsCryptoBaseUnit: [string] = [
        stakedAmountCryptoBaseUnitIncludeRewards.minus(stakedAmountCryptoBaseUnit).toFixed(0),
      ]

      const dateUnlocked = await (async () => {
        try {
          if (stakingOpportunityId === thorchainAssetId) {
            const { data } = await axios.get<[ThorchainRunepoolMemberPositionResponse]>(
              `${getConfig().VITE_THORCHAIN_MIDGARD_URL}/runepool/${asset_address}`,
            )

            return bnOrZero(data[0].dateLastAdded).plus(runePoolDepositMaturityTime).toNumber()
          }

          const { data } = await axios.get<MidgardSaverResponse>(
            `${getConfig().VITE_THORCHAIN_MIDGARD_URL}/saver/${asset_address}`,
          )

          const dateLastAdded = data.pools.find(({ pool }) => pool === accountPosition.asset)
            ?.dateLastAdded

          return dateLastAdded
            ? bnOrZero(dateLastAdded).plus(liquidityLockupTime).toNumber()
            : undefined
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) return
          throw new Error('Error fetching savers date last added')
        }
      })()

      stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
        isLoaded: true,
        userStakingId,
        stakedAmountCryptoBaseUnit: stakedAmountCryptoBaseUnit.toFixed(0),
        rewardsCryptoBaseUnit: { amounts: rewardsAmountsCryptoBaseUnit, claimable: false },
        dateUnlocked,
      }
    }

    return Promise.resolve({ data })
  } catch (e) {
    return Promise.resolve({
      data: {
        byId: stakingOpportunitiesUserDataByUserStakingId,
        type: defiType,
      },
    })
  }
}

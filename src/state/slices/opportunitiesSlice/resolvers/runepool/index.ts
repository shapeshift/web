import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { thorPoolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { BigAmount, isSome } from '@shapeshiftoss/utils'
import axios from 'axios'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
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
  ThorchainRunepoolInformationResponseSuccess,
  ThorchainRunepoolMemberPositionResponse,
  ThorchainRunepoolReservePositionsResponse,
} from './types'
import { getRunePoolPosition } from './utils'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import { selectRunePoolMaturityTime } from '@/lib/utils/thorchain/selectors'
import type { ThorchainMimir } from '@/lib/utils/thorchain/types'
import { thornode } from '@/react-queries/queries/thornode'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'

export const runePoolOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const opportunityIds: StakingId[] = []

  if (getConfig().VITE_FEATURE_RUNEPOOL) {
    opportunityIds.push(thorchainAssetId as StakingId)
  }

  return Promise.resolve({
    data: opportunityIds,
  })
}

export const runePoolStakingOpportunitiesMetadataResolver = async ({
  opportunityIds,
  defiType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesById: Record<StakingId, OpportunityMetadata> = {}

  const thorchainAsset = selectAssetById(state, thorchainAssetId)

  if (!opportunityIds?.length || !thorchainAsset) {
    return {
      data: {
        byId: stakingOpportunitiesById,
        type: defiType,
      },
    }
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

  const { data: reservePositions } = await axios.get<ThorchainRunepoolReservePositionsResponse>(
    `${getConfig().VITE_THORCHAIN_MIDGARD_URL}/member/thor1dheycdevq39qlkxs2a6wuuzyn4aqxhve4qxtxt`,
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
            BigAmount.fromPrecision({
              value: adjustedRatio.toFixed(),
              precision: asset.precision,
            }).toBaseUnit(),
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
    provider: DefiProvider.RunePool,
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
    isClaimableRewards: false,
  }

  return {
    data: {
      byId: stakingOpportunitiesById,
      type: defiType,
    },
  }
}

export const runePoolStakingOpportunitiesUserDataResolver = async ({
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

    const runePoolDepositMaturityTime = selectRunePoolMaturityTime(mimir)

    for (const stakingOpportunityId of opportunityIds) {
      const asset = selectAssetById(state, stakingOpportunityId)
      if (!asset)
        throw new Error(`Cannot get asset for stakingOpportunityId: ${stakingOpportunityId}`)

      const userStakingId = serializeUserStakingId(accountId, stakingOpportunityId)

      const position = await getRunePoolPosition(accountId)

      // No position - either it was never deposited into, or fully withdrawn
      if (!position) {
        stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
          isLoaded: true,
          userStakingId,
          stakedAmountCryptoBaseUnit: '0',
          rewardsCryptoBaseUnit: { amounts: ['0'], claimable: false },
        }
        continue
      }

      const stakedAmountCryptoBaseUnit = bn(
        BigAmount.fromPrecision({
          value: fromThorBaseUnit(position.depositValueThorBaseUnit).toFixed(),
          precision: asset.precision,
        }).toBaseUnit(),
      ) // to actual asset precision base unit

      const stakedAmountCryptoBaseUnitIncludeRewards = bn(
        BigAmount.fromPrecision({
          value: fromThorBaseUnit(position.redeemValueThorBaseUnit).toFixed(),
          precision: asset.precision,
        }).toBaseUnit(),
      ) // to actual asset precision base unit

      const rewardsAmountsCryptoBaseUnit: [string] = [
        stakedAmountCryptoBaseUnitIncludeRewards.minus(stakedAmountCryptoBaseUnit).toFixed(0),
      ]

      const dateUnlocked = await (async () => {
        try {
          const { data } = await axios.get<[ThorchainRunepoolMemberPositionResponse]>(
            `${getConfig().VITE_THORCHAIN_MIDGARD_URL}/runepool/${position.address}`,
          )

          return bnOrZero(data[0].dateLastAdded).plus(runePoolDepositMaturityTime).toNumber()
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) return
          throw new Error('Error fetching RUNEPool date last added')
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

import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectFeatureFlags, selectMarketDataById } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  OpportunityId,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import type { OpportunitiesMetadataResolverInput } from '../types'

type MidgardPoolResponse = {
  annualPercentageRate: string
  asset: string
  assetDepth: string
  assetPrice: string
  assetPriceUSD: string
  liquidityUnits: string
  nativeDecimal: string
  poolAPY: string
  runeDepth: string
  saversAPR: string
  saversDepth: string
  saversUnits: string
  status: string
  synthSupply: string
  synthUnits: string
  units: string
  volume24h: string
}

const THOR_PRECISION = 8

const getThorchainPools = async (): Promise<ThornodePoolResponse[]> => {
  const { data: opportunitiesData } = await axios.get<ThornodePoolResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
  )

  if (!opportunitiesData) return []

  return opportunitiesData
}

const getMidgardPools = async (): Promise<MidgardPoolResponse[]> => {
  const { data: poolsData } = await axios.get<MidgardPoolResponse[]>(
    `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
  )

  if (!poolsData) return []

  return poolsData
}

export const thorchainSaversOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const thorchainPools = await getThorchainPools()

  if (!thorchainPools.length) {
    throw new Error('Error fetching THORChain pools')
  }

  const opportunityIds = thorchainPools.reduce<OpportunityId[]>((acc, currentPool) => {
    const maybeOpportunityId = adapters.poolAssetIdToAssetId(currentPool.asset)

    if (
      bnOrZero(currentPool.savers_depth).gt(0) &&
      maybeOpportunityId &&
      currentPool.status === 'Available'
    ) {
      acc.push(maybeOpportunityId as StakingId)
    }

    return acc
  }, [])

  return {
    data: opportunityIds,
  }
}

export const thorchainSaversStakingOpportunitiesMetadataResolver = async ({
  opportunityIds,
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput<DefiProvider.ThorchainSavers, DefiType.Staking>
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { SaversVaults } = selectFeatureFlags(state)

  if (!(SaversVaults && opportunityIds?.length)) {
    throw new Error('Not ready to fetch THORChain savers metadata')
  }

  const midgardPools = await getMidgardPools()

  // It might be tempting to paralelize the two THOR requests - don't
  // Midgard is less reliable, so there's no point to continue the flow if this fails
  if (!midgardPools.length) {
    throw new Error('Error fetching THORChain midgard pools')
  }

  const thorchainPools = await getThorchainPools()

  if (!thorchainPools.length) {
    throw new Error('Error fetching THORChain pools')
  }

  const stakingOpportunitiesById: Record<
    StakingId,
    OpportunityMetadata<DefiProvider.ThorchainSavers, DefiType.Staking>
  > = {}

  for (const thorchainPool of thorchainPools) {
    const assetId = adapters.poolAssetIdToAssetId(thorchainPool.asset)
    if (!assetId || !opportunityIds.includes(assetId as OpportunityId)) continue

    const opportunityId = assetId as StakingId

    // Thorchain is slightly different from other opportunities in that there is no contract address for the opportunity
    // The way we represent it, the opportunityId is both the opportunityId/assetId and the underlyingAssetId
    // That's an oversimplification, as this ties a native AssetId e.g btcAssetId or ethAssetId, to a Savers opportunity
    // If we were to ever support another native asset staking opportunity e.g Ethereum 2.0 consensus layer staking
    // we would need to revisit this by using generic keys as an opportunityId
    const asset = selectAssetById(state, assetId)
    const underlyingAsset = selectAssetById(state, assetId)
    const marketData = selectMarketDataById(state, assetId)

    if (!asset || !underlyingAsset || !marketData) continue

    const apy = bnOrZero(
      midgardPools.find(pool => pool.asset === thorchainPool.asset)?.saversAPR,
    ).toString()
    const tvl = bnOrZero(thorchainPool.savers_units)
      .div(bn(10).pow(THOR_PRECISION))
      .times(marketData.price)
      .toFixed()
    // NOT the same as the TVL:
    // - TVL is the fiat total of assets locked
    // - supply is the fiat total of assets locked, including the accrued value, accounting in the max. cap
    const saversSupplyIncludeAccruedFiat = bnOrZero(thorchainPool.savers_depth)
      .div(bn(10).pow(THOR_PRECISION))
      .times(marketData.price)
      .toFixed()
    const saversMaxSupplyFiat = bnOrZero(thorchainPool.synth_supply)
      .plus(thorchainPool.synth_supply_remaining)
      .div(bn(10).pow(THOR_PRECISION))
      .times(marketData.price)
      .toFixed()

    stakingOpportunitiesById[opportunityId] = {
      apy,
      assetId,
      provider: DefiProvider.ThorchainSavers,
      tvl,
      type: DefiType.Staking,
      underlyingAssetId: assetId,
      underlyingAssetIds: [assetId] as [AssetId],
      rewardAssetIds: [assetId] as [AssetId],
      // Thorchain opportunities represent a single native asset being staked, so the ratio will always be 1
      underlyingAssetRatios: ['1'],
      name: `${underlyingAsset.symbol} Vault`,
      opportunitySpecific: {
        saversSupplyIncludeAccruedFiat,
        saversMaxSupplyFiat,
      },
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

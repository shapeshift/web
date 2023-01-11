import type { AccountId, AssetId, ToAssetIdArgs } from '@shapeshiftoss/caip'
import { adapters, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import memoize from 'lodash/memoize'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { accountIdToFeeAssetId, isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById, selectFeatureFlags, selectMarketDataById } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
  OpportunityId,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import { serializeUserStakingId, toOpportunityId } from '../../utils'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
} from '../types'

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

type ThorchainSaverPositionResponse = {
  asset: string
  asset_address: string
  last_add_height: number
  units: string
  asset_deposit_value: string
  asset_redeem_value: string
  growth_pct: string
}

const THOR_PRECISION = 8

// Memoized on accountId, see lodash docs:
// "By default, the first argument provided to the memoized function is used as the map cache key."
const getAccountAddresses = memoize(async (accountId: AccountId): Promise<string[]> => {
  if (isUtxoAccountId(accountId)) {
    const { chainId, account: pubkey } = fromAccountId(accountId)
    const chainAdapters = getChainAdapterManager()
    const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
    if (!adapter) throw new Error(`no adapter for ${chainId} not available`)

    const {
      chainSpecific: { addresses },
    } = await adapter.getAccount(pubkey)

    if (!addresses) return []

    return addresses.map(address =>
      address.pubkey.startsWith('bitcoincash')
        ? address.pubkey.replace('bitcoincash:', '')
        : address.pubkey,
    )
  }

  return [fromAccountId(accountId).account]
})

const getThorchainPools = async (): Promise<ThornodePoolResponse[]> => {
  const { data: opportunitiesData } = await axios.get<ThornodePoolResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
  )

  if (!opportunitiesData) return []

  return opportunitiesData
}

const getThorchainSaversPositions = async (
  assetId: AssetId,
): Promise<ThorchainSaverPositionResponse[]> => {
  const poolId = adapters.assetIdToPoolAssetId({ assetId })

  if (!poolId) return []

  const { data: opportunitiesData } = await axios.get<ThorchainSaverPositionResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolId}/savers`,
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
  data: GetOpportunityMetadataOutput
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

  const stakingOpportunitiesById: Record<StakingId, OpportunityMetadata> = {}

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

    const underlyingAssetRatioBaseUnit = bn(1).times(bn(10).pow(asset.precision)).toString()
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
      underlyingAssetRatiosBaseUnit: [underlyingAssetRatioBaseUnit],
      name: `${underlyingAsset.symbol} Vault`,
      saversSupplyIncludeAccruedFiat,
      saversMaxSupplyFiat,
      isFull: thorchainPool.synth_mint_paused,
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

export const thorchainSaversStakingOpportunitiesUserDataResolver = async ({
  opportunityType,
  accountId,
  reduxApi,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const stakingOpportunityId = accountIdToFeeAssetId(accountId)

  if (!stakingOpportunityId)
    throw new Error(`Cannot get stakingOpportunityId for accountId: ${accountId}`)

  const asset = selectAssetById(state, stakingOpportunityId)
  if (!asset) throw new Error(`Cannot get asset for stakingOpportunityId: ${stakingOpportunityId}`)

  const toAssetIdParts: ToAssetIdArgs = {
    assetNamespace: fromAssetId(stakingOpportunityId).assetNamespace,
    assetReference: fromAssetId(stakingOpportunityId).assetReference,
    chainId: fromAssetId(stakingOpportunityId).chainId,
  }
  const opportunityId = toOpportunityId(toAssetIdParts)
  const userStakingId = serializeUserStakingId(accountId, opportunityId)

  const allPositions = await getThorchainSaversPositions(stakingOpportunityId)

  if (!allPositions.length)
    throw new Error(
      `Error fetching THORCHain savers positions for assetId: ${stakingOpportunityId}`,
    )

  // Returns either
  // - A tuple made of a single address for EVM and Cosmos chains since the address *is* the account
  // - An array of many addresses for UTXOs, since an xpub can derive many many addresses
  const accountAddresses = await getAccountAddresses(accountId)

  // TODO(gomes): This is wrong for UTXOs. We need to pass an address, not an AccountId
  const accountPosition = allPositions.find(
    ({ asset_address }) =>
      asset_address === accountAddresses.find(accountAddress => accountAddress === asset_address),
  )

  // No position for that AccountId, which is actually valid - don't throw
  if (!accountPosition)
    return Promise.resolve({
      data: {
        byId: stakingOpportunitiesUserDataByUserStakingId,
        type: opportunityType,
      },
    })

  const { asset_deposit_value, asset_redeem_value } = accountPosition

  const stakedAmountCryptoBaseUnit = bnOrZero(asset_deposit_value)
    .div(bn(10).pow(THOR_PRECISION)) // to crypto precision from THOR 8 dp base unit
    .times(bn(10).pow(asset.precision)) // to actual asset precision base unit

  const stakedAmountCryptoBaseUnitIncludeRewards = bnOrZero(asset_redeem_value)
    .div(bn(10).pow(THOR_PRECISION)) // to crypto precision from THOR 8 dp base unit
    .times(bn(10).pow(asset.precision)) // to actual asset precision base unit

  const rewardsAmountsCryptoBaseUnit = [
    stakedAmountCryptoBaseUnitIncludeRewards.minus(stakedAmountCryptoBaseUnit).toFixed(),
  ] as [string]

  stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
    stakedAmountCryptoBaseUnit: stakedAmountCryptoBaseUnit.toFixed(),
    rewardsAmountsCryptoBaseUnit,
  }

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: opportunityType,
  }

  return Promise.resolve({ data })
}

import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import type { UserEarnOpportunityType } from 'context/FoxEthProvider/FoxEthProvider'

// LP contracts
export const foxEthPair = [ethAssetId, foxAssetId] as const
export const foxEthLpAssetId: AssetId = 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c'
export const foxEthLpAssetIds = [foxEthLpAssetId] as const

// Staking contracts
export const foxEthStakingAssetIdV1: AssetId =
  'eip155:1/erc20:0xdd80e21669a664bce83e3ad9a0d74f8dad5d9e72'
export const foxEthStakingAssetIdV2: AssetId =
  'eip155:1/erc20:0xc54b9f82c1c54e9d4d274d633c7523f2299c42a0'
export const foxEthStakingAssetIdV3: AssetId =
  'eip155:1/erc20:0x212ebf9fd3c10f371557b08e993eaab385c3932b'
export const foxEthStakingAssetIdV4: AssetId =
  'eip155:1/erc20:0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0'

// Tuple of all staking contracts, to iterate over and dispatch RTK queries for
export const foxEthStakingIds = [
  foxEthStakingAssetIdV1,
  foxEthStakingAssetIdV2,
  foxEthStakingAssetIdV3,
  foxEthStakingAssetIdV4,
] as const

export const STAKING_ID_TO_NAME = {
  [foxEthStakingAssetIdV1]: 'Fox Farming V1',
  [foxEthStakingAssetIdV2]: 'Fox Farming V2',
  [foxEthStakingAssetIdV3]: 'Fox Farming V3',
  [foxEthStakingAssetIdV4]: 'Fox Farming V4',
}

export const STAKING_ID_DELIMITER = '*'

// Earn opportunity types - everyting after this comment is here for backwards compatibility
// with the expected EarnOpportunityType the DeFi hooks / normalizeOpportunity expect
// The current abstraction just forces us to pass a lot of fluff that could be derived / we don't need
// This will go away in a follow-up PR as we remove those hooks

export const earnLpOpportunity: Omit<EarnOpportunityType, 'chainId'> = {
  assetId: foxEthLpAssetId,
  opportunityName: 'ETH/FOX Pool',
  provider: DefiProvider.FoxFarming,
  contractAddress: fromAssetId(foxEthLpAssetId).assetReference,
  rewardAddress: '',
  tvl: '',
  fiatAmount: '',
  cryptoAmount: '',
  isLoaded: false,
  type: DefiType.LiquidityPool,
}

export const baseFarmingOpportunity = {
  provider: DefiProvider.FoxFarming,
  rewardAddress: fromAssetId(foxAssetId).assetReference,
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  rewardsAmountCryptoPrecision: '',
  isLoaded: false,
  type: DefiType.Farming,
}

export const v4FarmingOpportunity: Omit<UserEarnOpportunityType, 'chainId'> = {
  ...baseFarmingOpportunity,
  assetId: foxEthStakingAssetIdV4,
  contractAddress: fromAssetId(foxEthStakingAssetIdV4).assetReference,
  opportunityName: 'Fox Farming V4',
}

export const v3FarmingOpportunity: Omit<UserEarnOpportunityType, 'chainId'> = {
  ...baseFarmingOpportunity,
  assetId: foxEthStakingAssetIdV3,
  contractAddress: fromAssetId(foxEthStakingAssetIdV3).assetReference,
  opportunityName: 'Fox Farming V3',
}

export const v2FarmingOpportunity: Omit<UserEarnOpportunityType, 'chainId'> = {
  ...baseFarmingOpportunity,
  assetId: foxEthStakingAssetIdV2,
  contractAddress: fromAssetId(foxEthStakingAssetIdV2).assetReference,
  opportunityName: 'Fox Farming V2',
}

export const v1FarmingOpportunity: Omit<UserEarnOpportunityType, 'chainId'> = {
  ...baseFarmingOpportunity,
  assetId: foxEthStakingAssetIdV1,
  contractAddress: fromAssetId(foxEthStakingAssetIdV1).assetReference,
  opportunityName: 'Fox Farming V1',
}

export const STAKING_EARN_OPPORTUNITIES = {
  [foxEthStakingAssetIdV1]: v1FarmingOpportunity,
  [foxEthStakingAssetIdV2]: v2FarmingOpportunity,
  [foxEthStakingAssetIdV3]: v3FarmingOpportunity,
  [foxEthStakingAssetIdV4]: v4FarmingOpportunity,
}

export const LP_EARN_OPPORTUNITIES = {
  [foxEthLpAssetId]: earnLpOpportunity,
}

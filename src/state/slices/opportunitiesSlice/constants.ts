import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'

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
export const foxEthStakingAssetIdV5: AssetId =
  'eip155:1/erc20:0xc14eaa8284feff79edc118e06cadbf3813a7e555'

// Tuple of all staking contracts, to iterate over and dispatch RTK queries for
export const foxEthStakingIds = [
  foxEthStakingAssetIdV1,
  foxEthStakingAssetIdV2,
  foxEthStakingAssetIdV3,
  foxEthStakingAssetIdV4,
  // TODO: uncomment me in a follow-up PR swapping v4 for v5 everywhere
  // foxEthStakingAssetIdV5,
] as const

export const STAKING_ID_TO_NAME = {
  [foxEthStakingAssetIdV1]: 'Fox Farming V1',
  [foxEthStakingAssetIdV2]: 'Fox Farming V2',
  [foxEthStakingAssetIdV3]: 'Fox Farming V3',
  [foxEthStakingAssetIdV4]: 'Fox Farming V4',
  [foxEthStakingAssetIdV5]: 'Fox Farming V5',
}

export const STAKING_ID_DELIMITER = '*'

// Earn opportunity types - everyting after this comment is here for backwards compatibility
// with the expected EarnOpportunityType the DeFi hooks / normalizeOpportunity expect
// The current abstraction just forces us to pass a lot of fluff that could be derived / we don't need
// This will go away in a follow-up PR as we remove those hooks

export const earnLpOpportunity: EarnOpportunityType = {
  assetId: foxEthLpAssetId,
  opportunityName: 'ETH/FOX Pool',
  provider: DefiProvider.FoxFarming,
  contractAddress: fromAssetId(foxEthLpAssetId).assetReference,
  chainId: ethChainId,
  rewardAddress: '',
  apy: '',
  tvl: '',
  fiatAmount: '',
  cryptoAmount: '',
  isLoaded: false,
  type: DefiType.LiquidityPool,
}

export const baseEarnFarmingOpportunity = {
  provider: DefiProvider.FoxFarming,
  rewardAddress: fromAssetId(foxAssetId).assetReference,
  chainId: ethChainId,
  apy: '',
  tvl: '',
  assetId: foxEthLpAssetId,
  fiatAmount: '',
  cryptoAmount: '',
  rewardsAmountCryptoPrecision: '',
  isLoaded: false,
  type: DefiType.Farming,
}

export const v5EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV5,
  contractAddress: fromAssetId(foxEthStakingAssetIdV5).assetReference,
  opportunityName: 'Fox Farming V5',
}

export const v4EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV4,
  contractAddress: fromAssetId(foxEthStakingAssetIdV4).assetReference,
  opportunityName: STAKING_ID_TO_NAME[foxEthStakingAssetIdV4],
}

export const v3EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV3,
  contractAddress: fromAssetId(foxEthStakingAssetIdV3).assetReference,
  opportunityName: STAKING_ID_TO_NAME[foxEthStakingAssetIdV3],
}

export const v2EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV2,
  contractAddress: fromAssetId(foxEthStakingAssetIdV2).assetReference,
  opportunityName: STAKING_ID_TO_NAME[foxEthStakingAssetIdV2],
}

export const v1EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV1,
  contractAddress: fromAssetId(foxEthStakingAssetIdV1).assetReference,
  opportunityName: STAKING_ID_TO_NAME[foxEthStakingAssetIdV1],
}

export const STAKING_EARN_OPPORTUNITIES = {
  [foxEthStakingAssetIdV1]: v1EarnFarmingOpportunity,
  [foxEthStakingAssetIdV2]: v2EarnFarmingOpportunity,
  [foxEthStakingAssetIdV3]: v3EarnFarmingOpportunity,
  [foxEthStakingAssetIdV4]: v4EarnFarmingOpportunity,
}

export const LP_EARN_OPPORTUNITIES = {
  [foxEthLpAssetId]: earnLpOpportunity,
}

import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, foxAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'

import type { LpId, StakingId } from './types'

// Exported as a string literal for contract address discrimination purposes
export const uniswapV2Router02ContractAddress =
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' as const
// UniswapV2Router02 https://docs.uniswap.org/protocol/V2/reference/smart-contracts/router-02
export const uniswapV2Router02AssetId: AssetId =
  'eip155:1/erc20:0x7a250d5630b4cf539739df2c5dacb4c659f2488d'
// LP contracts
export const foxEthPair = [ethAssetId, foxAssetId] as const
// Exported as a string literal for contract address discrimination purposes
export const foxEthLpContractAddress = '0x470e8de2ebaef52014a47cb5e6af86884947f08c' as const
export const foxEthLpAssetId: LpId = 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c'
export const foxEthLpAssetIds = [foxEthLpAssetId] as const

// Staking contract addresses as string literals
export const foxEthStakingContractAddressV1 = '0xdd80e21669a664bce83e3ad9a0d74f8dad5d9e72' as const
export const foxEthStakingContractAddressV2 = '0xc54b9f82c1c54e9d4d274d633c7523f2299c42a0' as const
export const foxEthStakingContractAddressV3 = '0x212ebf9fd3c10f371557b08e993eaab385c3932b' as const
export const foxEthStakingContractAddressV4 = '0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0' as const
export const foxEthStakingContractAddressV5 = '0xc14eaa8284feff79edc118e06cadbf3813a7e555' as const

export const foxEthStakingContractAddresses = [
  foxEthStakingContractAddressV5,
  foxEthStakingContractAddressV4,
  foxEthStakingContractAddressV3,
  foxEthStakingContractAddressV2,
  foxEthStakingContractAddressV1,
] as const

export type FoxEthStakingContractAddress = typeof foxEthStakingContractAddresses[number]

export const isFoxEthStakingContractAddress = (
  address: string,
): address is FoxEthStakingContractAddress =>
  foxEthStakingContractAddresses.includes(address as FoxEthStakingContractAddress)

// Staking contracts as flavored StakingIds
export const foxEthStakingAssetIdV1: StakingId =
  'eip155:1/erc20:0xdd80e21669a664bce83e3ad9a0d74f8dad5d9e72'
export const foxEthStakingAssetIdV2: StakingId =
  'eip155:1/erc20:0xc54b9f82c1c54e9d4d274d633c7523f2299c42a0'
export const foxEthStakingAssetIdV3: StakingId =
  'eip155:1/erc20:0x212ebf9fd3c10f371557b08e993eaab385c3932b'
export const foxEthStakingAssetIdV4: StakingId =
  'eip155:1/erc20:0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0'
export const foxEthStakingAssetIdV5: StakingId =
  'eip155:1/erc20:0xc14eaa8284feff79edc118e06cadbf3813a7e555'

// Tuple of all staking contracts, to iterate over and dispatch RTK queries for
export const foxEthStakingIds = [
  foxEthStakingAssetIdV1,
  foxEthStakingAssetIdV2,
  foxEthStakingAssetIdV3,
  foxEthStakingAssetIdV4,
  foxEthStakingAssetIdV5,
] as const

export const STAKING_ID_TO_VERSION = {
  [foxEthStakingAssetIdV1]: 'V1',
  [foxEthStakingAssetIdV2]: 'V2',
  [foxEthStakingAssetIdV3]: 'V3',
  [foxEthStakingAssetIdV4]: 'V4',
  [foxEthStakingAssetIdV5]: 'V5',
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
  cryptoAmountBaseUnit: '',
  cryptoAmountPrecision: '',
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
  cryptoAmountBaseUnit: '',
  cryptoAmountPrecision: '',
  isLoaded: false,
  type: DefiType.Farming,
}

export const v5EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV5,
  contractAddress: fromAssetId(foxEthStakingAssetIdV5).assetReference,
  opportunityName: 'FOX Farming',
}

export const v4EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV4,
  contractAddress: fromAssetId(foxEthStakingAssetIdV4).assetReference,
  opportunityName: 'FOX Farming',
}

export const v3EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV3,
  contractAddress: fromAssetId(foxEthStakingAssetIdV3).assetReference,
  opportunityName: 'FOX Farming',
}

export const v2EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV2,
  contractAddress: fromAssetId(foxEthStakingAssetIdV2).assetReference,
  opportunityName: 'FOX Farming',
}

export const v1EarnFarmingOpportunity: EarnOpportunityType = {
  ...baseEarnFarmingOpportunity,
  assetId: foxEthStakingAssetIdV1,
  contractAddress: fromAssetId(foxEthStakingAssetIdV1).assetReference,
  opportunityName: 'FOX Farming',
}

export const STAKING_EARN_OPPORTUNITIES = {
  [foxEthStakingAssetIdV1]: v1EarnFarmingOpportunity,
  [foxEthStakingAssetIdV2]: v2EarnFarmingOpportunity,
  [foxEthStakingAssetIdV3]: v3EarnFarmingOpportunity,
  [foxEthStakingAssetIdV4]: v4EarnFarmingOpportunity,
  [foxEthStakingAssetIdV5]: v5EarnFarmingOpportunity,
}

export const LP_EARN_OPPORTUNITIES = {
  [foxEthLpAssetId]: earnLpOpportunity,
}

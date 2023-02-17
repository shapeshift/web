import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { getTypeGuardAssertion } from 'lib/utils'

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

const isFoxEthStakingContractAddress = (
  address: FoxEthStakingContractAddress | string,
): address is FoxEthStakingContractAddress =>
  foxEthStakingContractAddresses.includes(address as FoxEthStakingContractAddress)

export const assertIsFoxEthStakingContractAddress: (
  value: FoxEthStakingContractAddress | string,
) => asserts value is FoxEthStakingContractAddress = getTypeGuardAssertion(
  isFoxEthStakingContractAddress,
  "Contract address isn't a known ETH/FOX staking address",
)

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

// Tuple of all staking contracts as AssetIds, to iterate over and dispatch RTK queries for
export const foxEthAssetIds = [
  foxEthStakingAssetIdV1,
  foxEthStakingAssetIdV2,
  foxEthStakingAssetIdV3,
  foxEthStakingAssetIdV4,
  foxEthStakingAssetIdV5,
] as const
export const foxEthStakingIds = foxEthAssetIds as readonly StakingId[]

export const STAKING_ID_TO_VERSION = {
  [foxEthStakingAssetIdV1]: 'V1',
  [foxEthStakingAssetIdV2]: 'V2',
  [foxEthStakingAssetIdV3]: 'V3',
  [foxEthStakingAssetIdV4]: 'V4',
  [foxEthStakingAssetIdV5]: 'V5',
}

export const STAKING_ID_DELIMITER = '*'

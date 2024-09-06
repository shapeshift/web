import type { Address } from 'viem'

import { erc20ABI } from './abis/ERC20ABI'
import { FarmingABI } from './abis/farmingAbi'
import { IUniswapV2Pair } from './abis/IUniswapV2Pair'
import { IUniswapV2Router02 } from './abis/IUniswapV2Router02'
import { THORChain_RouterABI } from './abis/THORCHAIN_RouterABI'
import { ContractType } from './types'

export const WETH_TOKEN_CONTRACT_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
export const FOX_TOKEN_CONTRACT_ADDRESS = '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'

// Staking contract addresses as string literals
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V1 =
  '0xdd80e21669a664bce83e3ad9a0d74f8dad5d9e72' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V2 =
  '0xc54b9f82c1c54e9d4d274d633c7523f2299c42a0' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V3 =
  '0x212ebf9fd3c10f371557b08e993eaab385c3932b' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V4 =
  '0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V5 =
  '0xc14eaa8284feff79edc118e06cadbf3813a7e555' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V6 =
  '0xebb1761ad43034fd7faa64d84e5bbd8cb5c40b68' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V7 =
  '0x5939783dbf3e9f453a69bc9ddc1e492efac1fbcb' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V8 =
  '0x662da6c777a258382f08b979d9489c3fbbbd8ac3' as const
export const ETH_FOX_STAKING_CONTRACT_ADDRESS_V9 =
  '0x721720784b76265aa3e34c1c7ba02a6027bcd3e5' as const

export const foxEthStakingContractAddresses = [
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V9,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V8,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V7,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V6,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V5,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V4,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V3,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V2,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V1,
] as const

// Exported as a string literal for contract address discrimination purposes
export const ETH_FOX_POOL_CONTRACT_ADDRESS = '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c' as const

// Exported as a string literal for contract address discrimination purposes
export const UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS =
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as const

export const THOR_ROUTER_CONTRACT_ADDRESS_ETHEREUM = '0xd37bbe5744d730a1d98d8dc97c42f0ca46ad7146'

// RFOX on Arbitrum ERC1967Proxy contract address
// Uncomment me if you want to test RFOX with a shorter cooldown period
// export const RFOX_PROXY_CONTRACT_ADDRESS: Address = '0x1094c4a99fce60e69ffe75849309408f1262d304'
export const RFOX_PROXY_CONTRACT_ADDRESS: Address = '0xac2a4fd70bcd8bab0662960455c363735f0e2b56'

export const RFOX_REWARD_RATE = 1n * 10n ** 27n
export const RFOX_WAD = 1n * 10n ** 18n

export const CONTRACT_ADDRESS_TO_ABI = {
  [ETH_FOX_POOL_CONTRACT_ADDRESS]: IUniswapV2Pair,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V1]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V2]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V3]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V4]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V5]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V6]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V7]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V8]: FarmingABI,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V9]: FarmingABI,
  [FOX_TOKEN_CONTRACT_ADDRESS]: erc20ABI,
  [UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS]: IUniswapV2Router02,
  // THOR Router Mainnet
  [THOR_ROUTER_CONTRACT_ADDRESS_ETHEREUM]: THORChain_RouterABI,
} as const

export const CONTRACT_TYPE_TO_ABI = {
  [ContractType.UniV2Pair]: IUniswapV2Pair,
  [ContractType.ERC20]: erc20ABI,
  [ContractType.ThorRouter]: THORChain_RouterABI,
} as const

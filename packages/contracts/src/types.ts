import type { Address, GetContractReturnType, PublicClient } from 'viem'

import type { EVERGREEN_FARMING_ABI, FARMING_ABI } from './abis'
import type {
  CONTRACT_ADDRESS_TO_ABI,
  CONTRACT_TYPE_TO_ABI,
  ETH_FOX_POOL_CONTRACT,
  foxEthStakingContractAddresses,
} from './constants'

export enum ContractType {
  UniV2Pair = 'UniV2Pair',
  ERC20 = 'ERC20',
}

export type KnownContractAbiByAddress<T extends KnownContractAddress> =
  (typeof CONTRACT_ADDRESS_TO_ABI)[T]
export type KnownContractAbiByType<T extends ContractType> = (typeof CONTRACT_TYPE_TO_ABI)[T]

export type KnownContractByAddress<T extends KnownContractAddress> = GetContractReturnType<
  KnownContractAbiByAddress<T>,
  PublicClient,
  T
>

export type KnownContractByType<
  A extends KnownContractAddress,
  T extends ContractType,
> = GetContractReturnType<KnownContractAbiByType<T>, PublicClient, A>

export type KnownContractAddress = typeof ETH_FOX_POOL_CONTRACT | FoxEthStakingContractAddress

export type FoxEthStakingContractAddress = (typeof foxEthStakingContractAddresses)[number]
export type FoxEthStakingContractAbi = typeof FARMING_ABI | typeof EVERGREEN_FARMING_ABI
export type FoxEthStakingContract<T extends FoxEthStakingContractAbi> = T extends typeof FARMING_ABI
  ? GetContractReturnType<typeof FARMING_ABI, PublicClient, Address>
  : GetContractReturnType<typeof EVERGREEN_FARMING_ABI, PublicClient, Address>

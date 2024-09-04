import type { GetContractReturnType, PublicClient } from 'viem'

import type {
  CONTRACT_ADDRESS_TO_ABI,
  CONTRACT_TYPE_TO_ABI,
  ETH_FOX_POOL_CONTRACT_ADDRESS,
  FOX_TOKEN_CONTRACT_ADDRESS,
  foxEthStakingContractAddresses,
  THOR_ROUTER_CONTRACT_ADDRESS_ETHEREUM,
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
} from './constants'

export enum ContractType {
  UniV2Pair = 'UniV2Pair',
  ERC20 = 'ERC20',
  ThorRouter = 'ThorRouter',
}

export type KnownContractAbiByAddress<T extends KnownContractAddress> =
  (typeof CONTRACT_ADDRESS_TO_ABI)[T]
export type KnownContractAbiByType<T extends ContractType> = (typeof CONTRACT_TYPE_TO_ABI)[T]

export type KnownContractByAddress<T extends KnownContractAddress> = GetContractReturnType<
  KnownContractAbiByAddress<T>,
  PublicClient,
  T
>

export type KnownContract = KnownContractByAddress<KnownContractAddress>

export type KnownContractByType<
  A extends KnownContractAddress,
  T extends ContractType,
> = GetContractReturnType<KnownContractAbiByType<T>, PublicClient, A>

export type KnownContractAddress =
  | typeof ETH_FOX_POOL_CONTRACT_ADDRESS
  | FoxEthStakingContractAddress
  | typeof FOX_TOKEN_CONTRACT_ADDRESS
  | typeof UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS
  | typeof THOR_ROUTER_CONTRACT_ADDRESS_ETHEREUM

export type DefinedContract = {
  contract: KnownContractByAddress<KnownContractAddress>
  address: KnownContractAddress
}

export type FoxEthStakingContractAddress = (typeof foxEthStakingContractAddresses)[number]

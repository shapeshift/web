import type { Address, GetContractReturnType, PublicClient } from 'viem'
import type { FoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'

import type {
  ETH_FOX_POOL_CONTRACT_ADDRESS,
  FOX_TOKEN_CONTRACT_ADDRESS,
  THOR_ROUTER_CONTRACT_ADDRESS_ETHEREUM,
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
} from './constants'
import type { CONTRACT_ADDRESS_TO_ABI, CONTRACT_TYPE_TO_ABI } from './contractManager'

export enum ContractType {
  UniV2Pair = 'UniV2Pair',
  ERC20 = 'ERC20',
  ThorRouter = 'ThorRouter',
}

export type KnownContractByAddress<T extends KnownContractAddress> = GetContractReturnType<
  (typeof CONTRACT_ADDRESS_TO_ABI)[T],
  PublicClient,
  Address
>

export type KnownContractByType<T extends ContractType> = GetContractReturnType<
  (typeof CONTRACT_TYPE_TO_ABI)[T],
  PublicClient,
  Address
>

export type KnownContractAddress =
  | typeof ETH_FOX_POOL_CONTRACT_ADDRESS
  | FoxEthStakingContractAddress
  | typeof FOX_TOKEN_CONTRACT_ADDRESS
  | typeof UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS
  | typeof THOR_ROUTER_CONTRACT_ADDRESS_ETHEREUM

export type DefinedContract = {
  contract: KnownContractByAddress<KnownContractAddress>
  address: KnownContractAddress | `0x${string}`
}

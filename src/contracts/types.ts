import type { FoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'

import type {
  ETH_FOX_POOL_CONTRACT_ADDRESS,
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
} from './constants'
import type {
  CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT,
  CONTRACT_TYPE_TO_TYPECHAIN_CONTRACT,
} from './contractManager'

export enum ContractType {
  UniV2Pair = 'UniV2Pair',
  ERC20 = 'ERC20',
}

export type KnownContractByAddress<T extends KnownContractAddress> = ReturnType<
  typeof CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT[T]['connect']
>

export type KnownContractByType<T extends ContractType> = ReturnType<
  typeof CONTRACT_TYPE_TO_TYPECHAIN_CONTRACT[T]['connect']
>

export type KnownContractAddress =
  | typeof ETH_FOX_POOL_CONTRACT_ADDRESS
  | FoxEthStakingContractAddress
  | typeof FOX_TOKEN_CONTRACT_ADDRESS
  | typeof UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS

export type DefinedContract = {
  contract: KnownContractByAddress<KnownContractAddress>
  address: KnownContractAddress | `0x${string}`
}

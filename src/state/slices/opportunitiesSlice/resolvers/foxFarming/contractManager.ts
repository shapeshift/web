import type { Fetcher, Token } from '@uniswap/sdk'
import type { providers } from 'ethers'
import memoize from 'lodash/memoize'
import { FOX_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { getEthersProvider } from 'plugins/foxPage/utils'

import type { FoxEthStakingContractAddress } from '../../constants'
import {
  foxEthLpContractAddress,
  foxEthStakingContractAddressV1,
  foxEthStakingContractAddressV2,
  foxEthStakingContractAddressV3,
  foxEthStakingContractAddressV4,
  foxEthStakingContractAddressV5,
  uniswapV2Router02ContractAddress,
} from '../../constants'
import {
  ERC20ABI__factory,
  FarmingAbi__factory,
  IUniswapV2Pair__factory,
  IUniswapV2Router02__factory,
} from './contracts/factories'

type KnownContract<T extends KNOWN_CONTRACTS_ADDRESSES> = ReturnType<
  typeof CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT[T]['connect']
>

type KNOWN_CONTRACTS_ADDRESSES =
  | typeof foxEthLpContractAddress
  | FoxEthStakingContractAddress
  | typeof FOX_TOKEN_CONTRACT_ADDRESS
  | typeof uniswapV2Router02ContractAddress

type DefinedContract = {
  contract: KnownContract<KNOWN_CONTRACTS_ADDRESSES>
  address: KNOWN_CONTRACTS_ADDRESSES
}

const definedContracts: DefinedContract[] = []

export const CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT = {
  [foxEthLpContractAddress]: IUniswapV2Pair__factory,
  [foxEthStakingContractAddressV1]: FarmingAbi__factory,
  [foxEthStakingContractAddressV2]: FarmingAbi__factory,
  [foxEthStakingContractAddressV3]: FarmingAbi__factory,
  [foxEthStakingContractAddressV4]: FarmingAbi__factory,
  [foxEthStakingContractAddressV5]: FarmingAbi__factory,
  [FOX_TOKEN_CONTRACT_ADDRESS]: ERC20ABI__factory,
  [uniswapV2Router02ContractAddress]: IUniswapV2Router02__factory,
} as const

export const getOrCreateContract = <T extends KNOWN_CONTRACTS_ADDRESSES>(
  address: T,
): KnownContract<T> => {
  const definedContract = definedContracts.find(contract => contract.address === address)
  if (definedContract && definedContract.contract)
    return definedContract.contract as KnownContract<T>
  const typechainContract = CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT[address]
  const contract = typechainContract.connect(address, ethersProvider)
  definedContracts.push({ contract, address })
  return contract as KnownContract<T>
}
export const ethersProvider = getEthersProvider()

export const fetchPairData = memoize(
  async (
    tokenA: Token,
    tokenB: Token,
    fetchPairData: typeof Fetcher['fetchPairData'],
    provider: providers.Web3Provider,
  ) => await fetchPairData(tokenA, tokenB, provider),
)

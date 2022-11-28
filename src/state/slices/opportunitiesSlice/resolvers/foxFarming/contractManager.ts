import type { Fetcher, Token } from '@uniswap/sdk'
import type { providers } from 'ethers'
import memoize from 'lodash/memoize'
import { getEthersProvider } from 'plugins/foxPage/utils'

import {
  foxEthLpContractAddress,
  foxEthStakingContractAddressV1,
  foxEthStakingContractAddressV2,
  foxEthStakingContractAddressV3,
  foxEthStakingContractAddressV4,
  foxEthStakingContractAddressV5,
} from '../../constants'
import { FarmingAbi__factory } from './contracts'
import { IUniswapV2Pair__factory } from './contracts/factories/IUniswapV2Pair__factory'

type KnownContract<T extends KNOWN_CONTRACTS_ADDRESSES> = ReturnType<
  typeof CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT[T]['connect']
>

type KNOWN_CONTRACTS_ADDRESSES =
  | typeof foxEthLpContractAddress
  | typeof foxEthStakingContractAddressV1
  | typeof foxEthStakingContractAddressV2
  | typeof foxEthStakingContractAddressV3
  | typeof foxEthStakingContractAddressV4
  | typeof foxEthStakingContractAddressV5

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

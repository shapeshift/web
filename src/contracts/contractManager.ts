import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Token } from '@uniswap/sdk'
import { Fetcher } from '@uniswap/sdk'
import assert from 'assert'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { FarmingABI } from 'contracts/abis/farmingAbi'
import { IUniswapV2Pair } from 'contracts/abis/IUniswapV2Pair'
import { IUniswapV2Router02 } from 'contracts/abis/IUniswapV2Router02'
import { THORChain_RouterABI } from 'contracts/abis/THORCHAIN_RouterABI'
import memoize from 'lodash/memoize'
import type { Address } from 'viem'
import { getAddress, getContract } from 'viem'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { viemClientByChainId, viemEthMainnetClient } from 'lib/viem-client'

import {
  ETH_FOX_POOL_CONTRACT_ADDRESS,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V1,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V2,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V3,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V4,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V5,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V6,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V7,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V8,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V9,
  FOX_TOKEN_CONTRACT_ADDRESS,
  THOR_ROUTER_CONTRACT_ADDRESS_ETHEREUM,
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
} from './constants'
import type {
  DefinedContract,
  KnownContractAddress,
  KnownContractByAddress,
  KnownContractByType,
} from './types'
import { ContractType } from './types'

const definedContracts: DefinedContract[] = []

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

export const getOrCreateContractByAddress = <T extends KnownContractAddress>(
  address: T,
): KnownContractByAddress<T> => {
  const definedContract = definedContracts.find(contract => contract.address === address)
  if (definedContract && definedContract.contract)
    return definedContract.contract as unknown as KnownContractByAddress<T>
  const contractAbi = CONTRACT_ADDRESS_TO_ABI[address]

  const contract = getContract({
    abi: contractAbi,
    address,
    client: viemEthMainnetClient,
  }) as KnownContractByAddress<T>
  definedContracts.push({ contract, address } as unknown as DefinedContract)
  return contract
}

export const getOrCreateContractByType = <T extends ContractType>({
  address,
  type,
  chainId,
}: {
  address: string | `0x${string}`
  type: T
  chainId: ChainId
}): KnownContractByType<T> => {
  const definedContract = definedContracts.find(contract => contract.address === address)
  if (definedContract && definedContract.contract)
    return definedContract.contract as unknown as KnownContractByType<T>

  const publicClient = viemClientByChainId[chainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)

  const contract = getContract({
    abi: CONTRACT_TYPE_TO_ABI[type],
    address: address as Address,
    client: publicClient,
  })
  definedContracts.push({
    contract,
    address: getAddress(address),
  } as unknown as DefinedContract)
  return contract as KnownContractByType<T>
}

export const fetchUniV2PairData = memoize(async (pairAssetId: AssetId) => {
  const { assetReference, chainId } = fromAssetId(pairAssetId)
  // Checksum
  const contractAddress = getAddress(assetReference)
  const pair = getOrCreateContractByType({
    address: contractAddress,
    type: ContractType.UniV2Pair,
    chainId: KnownChainIds.EthereumMainnet,
  })
  const ethersV5Provider = getEthersV5Provider()

  const token0Address = await pair.read.token0()
  const token1Address = await pair.read.token1()
  const token0AssetId = toAssetId({
    chainId,
    assetNamespace: 'erc20',
    assetReference: token0Address,
  })
  const token1AssetId = toAssetId({
    chainId,
    assetNamespace: 'erc20',
    assetReference: token1Address,
  })

  const { chainReference: asset0EvmChainId, assetReference: asset0Address } =
    fromAssetId(token0AssetId)
  const { chainReference: asset1EvmChainId, assetReference: asset1Address } =
    fromAssetId(token1AssetId)

  const token0: Token = await Fetcher.fetchTokenData(
    Number(asset0EvmChainId),
    asset0Address,
    ethersV5Provider,
  )
  const token1: Token = await Fetcher.fetchTokenData(
    Number(asset1EvmChainId),
    asset1Address,
    ethersV5Provider,
  )

  return Fetcher.fetchPairData(token0, token1, ethersV5Provider)
})

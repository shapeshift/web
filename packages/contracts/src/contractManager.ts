import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { PartialRecord } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Token } from '@uniswap/sdk'
import { Fetcher } from '@uniswap/sdk'
import assert from 'assert'
import memoize from 'lodash/memoize'
import type { Address } from 'viem'
import { getAddress, getContract } from 'viem'

import { CONTRACT_ADDRESS_TO_ABI, CONTRACT_TYPE_TO_ABI } from './constants'
import { getEthersV5Provider } from './ethersProviderSingleton'
import type {
  KnownContract,
  KnownContractAbiByAddress,
  KnownContractAddress,
  KnownContractByAddress,
  KnownContractByType,
} from './types'
import { ContractType } from './types'
import { viemClientByChainId, viemEthMainnetClient } from './viemClient'

const definedContracts: PartialRecord<Address, KnownContract> = {}

export const getOrCreateContractByAddress: <A extends KnownContractAddress>(
  address: A,
) => KnownContractByAddress<A> = <A extends KnownContractAddress>(
  address: A,
): KnownContractByAddress<A> => {
  const checksumAddress = getAddress(address) as A
  const definedContract = definedContracts[checksumAddress]
  if (definedContract !== undefined) {
    return definedContract as unknown as KnownContractByAddress<A>
  }
  const contractAbi: KnownContractAbiByAddress<A> = CONTRACT_ADDRESS_TO_ABI[address]

  const contract = getContract({
    abi: contractAbi,
    address: checksumAddress,
    client: viemEthMainnetClient,
  })
  definedContracts[checksumAddress] = contract as unknown as KnownContract
  return contract as KnownContractByAddress<A>
}

export const getOrCreateContractByType: <A extends KnownContractAddress, T extends ContractType>({
  address,
  type,
  chainId,
}: {
  address: string | Address
  type: T
  chainId: ChainId
}) => KnownContractByType<A, T> = <A extends KnownContractAddress, T extends ContractType>({
  address,
  type,
  chainId,
}: {
  address: string | Address
  type: T
  chainId: ChainId
}): KnownContractByType<A, T> => {
  const checksumAddress = getAddress(address) as A
  const definedContract = definedContracts[checksumAddress]
  if (definedContract !== undefined) {
    return definedContract as unknown as KnownContractByType<A, T>
  }

  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)

  const contract = getContract({
    abi: CONTRACT_TYPE_TO_ABI[type],
    address: checksumAddress,
    client: publicClient,
  })
  definedContracts[checksumAddress] = contract as unknown as KnownContract
  return contract as unknown as KnownContractByType<A, T>
}

export const fetchUniV2PairData = memoize(async (pairAssetId: AssetId) => {
  const { assetReference, chainId } = fromAssetId(pairAssetId)
  const checksumAddress = getAddress(assetReference)
  const pair = getOrCreateContractByType({
    address: checksumAddress,
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

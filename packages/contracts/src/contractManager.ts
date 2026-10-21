import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { Pair, Token, TokenAmount } from '@uniswap/sdk'
import assert from 'assert'
import memoize from 'lodash/memoize'
import type { Address } from 'viem'
import { erc20Abi, getAddress, getContract } from 'viem'

import { CONTRACT_ADDRESS_TO_ABI, CONTRACT_TYPE_TO_ABI } from './constants'
import type {
  KnownContractAbiByAddress,
  KnownContractAddress,
  KnownContractByAddress,
  KnownContractByType,
} from './types'
import { ContractType } from './types'
import { viemClientByChainId, viemEthMainnetClient } from './viemClient'

export const getOrCreateContractByAddress: <A extends KnownContractAddress>(
  address: A,
) => KnownContractByAddress<A> = <A extends KnownContractAddress>(
  address: A,
): KnownContractByAddress<A> => {
  const checksumAddress = getAddress(address) as A
  const contractAbi: KnownContractAbiByAddress<A> = CONTRACT_ADDRESS_TO_ABI[address]

  const contract = getContract({
    abi: contractAbi,
    address: checksumAddress,
    client: viemEthMainnetClient,
  })
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

  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)

  const contract = getContract({
    abi: CONTRACT_TYPE_TO_ABI[type],
    address: checksumAddress,
    client: publicClient,
  })
  return contract as unknown as KnownContractByType<A, T>
}

const getUniV2PairTokens = memoize(async (pairAssetId: AssetId) => {
  const { assetReference, chainId } = fromAssetId(pairAssetId)
  const pair = getOrCreateContractByType({
    address: getAddress(assetReference),
    type: ContractType.UniV2Pair,
    chainId,
  })

  const [token0Address, token1Address] = await Promise.all([pair.read.token0(), pair.read.token1()])

  const client = viemClientByChainId[chainId]
  assert(client !== undefined, `no public client found for chainId '${chainId}'`)

  const [decimals0, decimals1] = await Promise.all(
    [token0Address, token1Address].map(address =>
      client.readContract({ address, abi: erc20Abi, functionName: 'decimals' }),
    ),
  )

  const evmChainId = Number(fromChainId(chainId).chainReference)

  return {
    pair,
    token0: new Token(evmChainId, token0Address, decimals0),
    token1: new Token(evmChainId, token1Address, decimals1),
  }
})

export const fetchUniV2PairData = async (pairAssetId: AssetId) => {
  const { pair, token0, token1 } = await getUniV2PairTokens(pairAssetId).catch(err => {
    getUniV2PairTokens.cache.delete(pairAssetId)
    throw err
  })

  const [reserve0, reserve1] = await pair.read.getReserves()

  // a uniswap v2 pair's token0 always sorts before token1, so reserves are already in token order
  return new Pair(
    new TokenAmount(token0, reserve0.toString()),
    new TokenAmount(token1, reserve1.toString()),
  )
}

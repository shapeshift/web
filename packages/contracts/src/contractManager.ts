import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { Pair, Token, TokenAmount } from '@uniswap/sdk'
import memoize from 'lodash/memoize'
import type { Address, GetContractReturnType, PublicClient } from 'viem'
import { erc20Abi, getAddress, getContract } from 'viem'

import { EVERGREEN_FARMING_ABI, FARMING_ABI, I_UNISWAP_V2_PAIR_ABI } from './abis'
import { ETH_FOX_POOL_CONTRACT, ETH_FOX_STAKING_EVERGREEN_CONTRACT } from './constants'
import type { FoxEthStakingContractAbi, FoxEthStakingContractAddress } from './types'
import { assertGetViemClient, viemEthMainnetClient } from './viemClient'

export const getFoxEthStakingContract = (
  address: FoxEthStakingContractAddress,
): GetContractReturnType<FoxEthStakingContractAbi, PublicClient, Address> =>
  getContract({
    abi: address === ETH_FOX_STAKING_EVERGREEN_CONTRACT ? EVERGREEN_FARMING_ABI : FARMING_ABI,
    address: getAddress(address),
    client: viemEthMainnetClient,
  })

export const getEthFoxPoolContract = (): GetContractReturnType<
  typeof I_UNISWAP_V2_PAIR_ABI,
  PublicClient,
  Address
> =>
  getContract({
    abi: I_UNISWAP_V2_PAIR_ABI,
    address: ETH_FOX_POOL_CONTRACT,
    client: viemEthMainnetClient,
  })

const getUniV2PairTokens = memoize(async (pairAssetId: AssetId) => {
  const { assetReference, chainId } = fromAssetId(pairAssetId)
  const client = assertGetViemClient(chainId)
  const pair = getContract({
    abi: I_UNISWAP_V2_PAIR_ABI,
    address: getAddress(assetReference),
    client,
  })

  const [token0Address, token1Address] = await Promise.all([pair.read.token0(), pair.read.token1()])

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

import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { Token } from '@uniswap/sdk'
import { Fetcher } from '@uniswap/sdk'
import { ethers } from 'ethers'
import memoize from 'lodash/memoize'
import { getEthersProvider } from 'lib/ethersProviderSingleton'
import type { FoxEthStakingContractAddress } from 'state/slices/opportunitiesSlice/constants'

import type { IUniswapV2Pair } from './__generated'
import {
  ERC20ABI__factory,
  FarmingAbi__factory,
  IUniswapV2Pair__factory,
  IUniswapV2Router02__factory,
} from './__generated/factories'
import {
  ETH_FOX_POOL_CONTRACT_ADDRESS,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V1,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V2,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V3,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V4,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V5,
  ETH_FOX_STAKING_CONTRACT_ADDRESS_V6,
  FOX_TOKEN_CONTRACT_ADDRESS,
  UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS,
} from './constants'

type KnownContract<T extends KnownContractAddress> = ReturnType<
  typeof CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT[T]['connect']
>

type KnownContractAddress =
  | typeof ETH_FOX_POOL_CONTRACT_ADDRESS
  | FoxEthStakingContractAddress
  | typeof FOX_TOKEN_CONTRACT_ADDRESS
  | typeof UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS

type DefinedContract = {
  contract: KnownContract<KnownContractAddress>
  address: KnownContractAddress
}

const definedContracts: DefinedContract[] = []

export const CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT = {
  [ETH_FOX_POOL_CONTRACT_ADDRESS]: IUniswapV2Pair__factory,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V1]: FarmingAbi__factory,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V2]: FarmingAbi__factory,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V3]: FarmingAbi__factory,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V4]: FarmingAbi__factory,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V5]: FarmingAbi__factory,
  [ETH_FOX_STAKING_CONTRACT_ADDRESS_V6]: FarmingAbi__factory,
  [FOX_TOKEN_CONTRACT_ADDRESS]: ERC20ABI__factory,
  [UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS]: IUniswapV2Router02__factory,
} as const

export const getOrCreateContract = <T extends KnownContractAddress>(
  address: T,
): KnownContract<T> => {
  const definedContract = definedContracts.find(contract => contract.address === address)
  if (definedContract && definedContract.contract)
    return definedContract.contract as KnownContract<T>
  const typechainContract = CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT[address]
  const ethersProvider = getEthersProvider()
  const contract = typechainContract.connect(address, ethersProvider)
  definedContracts.push({ contract, address })
  return contract as KnownContract<T>
}

export const fetchUniV2PairData = memoize(async (pairAssetId: AssetId) => {
  const { assetReference, chainId } = fromAssetId(pairAssetId)
  // Checksum
  const contractAddress = ethers.utils.getAddress(assetReference)
  // TODO(gomes): remove casting
  const pair: IUniswapV2Pair = getOrCreateContract(
    contractAddress as typeof ETH_FOX_POOL_CONTRACT_ADDRESS,
  )
  const ethersProvider = getEthersProvider()

  const token0Address = await pair.token0()
  const token1Address = await pair.token1()
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
    ethersProvider,
  )
  const token1: Token = await Fetcher.fetchTokenData(
    Number(asset1EvmChainId),
    asset1Address,
    ethersProvider,
  )

  return Fetcher.fetchPairData(token0, token1, ethersProvider)
})

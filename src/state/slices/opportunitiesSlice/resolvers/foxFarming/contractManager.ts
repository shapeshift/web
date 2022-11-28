import { fromAssetId } from '@shapeshiftoss/caip'
import type { Fetcher, Token } from '@uniswap/sdk'
import type { providers } from 'ethers'
import memoize from 'lodash/memoize'
import { getEthersProvider } from 'plugins/foxPage/utils'

import { foxEthLpAssetId, foxEthStakingIds } from '../../constants'
import type { FarmingAbi } from './contracts'
import { FarmingAbi__factory } from './contracts'
import { IUniswapV2Pair__factory } from './contracts/factories/IUniswapV2Pair__factory'
import type { IUniswapV2Pair } from './contracts/IUniswapV2Pair'

type KNOWN_CONTRACTS = IUniswapV2Pair | FarmingAbi
type DefinedContract = {
  contract: KNOWN_CONTRACTS
  address: string
}

const definedContracts: DefinedContract[] = []

export const CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT = {
  [fromAssetId(foxEthLpAssetId).assetReference]: IUniswapV2Pair__factory,
  ...Object.fromEntries(
    foxEthStakingIds.map(stakingId => [fromAssetId(stakingId).assetReference, FarmingAbi__factory]),
  ),
}

export const getOrCreateContract = (address: string): KNOWN_CONTRACTS => {
  const definedContract = definedContracts.find(contract => contract.address === address)
  if (definedContract && definedContract.contract) return definedContract.contract

  const typechainContract = CONTRACT_ADDRESS_TO_TYPECHAIN_CONTRACT[address]
  const contract = typechainContract.connect(address, ethersProvider)
  definedContracts.push({ contract, address })
  return contract
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

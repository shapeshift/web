import type { ContractInterface } from '@ethersproject/contracts'
import { Contract } from '@ethersproject/contracts'
import type { Fetcher, Token } from '@uniswap/sdk'
import type { providers } from 'ethers'
import memoize from 'lodash/memoize'
import { getEthersProvider } from 'plugins/foxPage/utils'

type DefinedContract = {
  contract: Contract
  address: string
}

const definedContracts: DefinedContract[] = []

export const getOrCreateContract = (address: string, abi: ContractInterface): Contract => {
  const definedContract = definedContracts.find(contract => contract.address === address)
  if (definedContract && definedContract.contract) return definedContract.contract

  const contract = new Contract(address, abi, ethersProvider)
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

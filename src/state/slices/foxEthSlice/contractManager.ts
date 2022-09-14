import type { ContractInterface } from '@ethersproject/contracts'
import { Contract } from '@ethersproject/contracts'

import { ethersProvider } from './utils'

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

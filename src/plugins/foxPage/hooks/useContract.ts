import { Contract, ContractInterface } from '@ethersproject/contracts'
import { InfuraProvider, Web3Provider } from '@ethersproject/providers'
import { useMemo } from 'react'

export function useContract(
  provider: Web3Provider | InfuraProvider | null,
  contractAddress: string | undefined,
  ABI: ContractInterface,
): Contract | null {
  return useMemo(() => {
    if (!contractAddress || !ABI || !provider) return null
    try {
      return new Contract(contractAddress, ABI, provider)
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [contractAddress, ABI, provider])
}

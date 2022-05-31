import { Contract, ContractInterface } from '@ethersproject/contracts'
import { InfuraProvider, JsonRpcSigner, Web3Provider } from '@ethersproject/providers'
import { useMemo } from 'react'

export function getSigner(library: Web3Provider | InfuraProvider, account: string): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked()
}

export function getProviderOrSigner(
  library: Web3Provider | InfuraProvider,
  account?: string,
): Web3Provider | JsonRpcSigner | InfuraProvider {
  return account ? getSigner(library, account) : library
}

export const getContract = (
  address: string,
  ABI: ContractInterface,
  library: Web3Provider | InfuraProvider,
  account?: string,
): Contract => new Contract(address, ABI, getProviderOrSigner(library, account) as any)

export function useContract(
  provider: Web3Provider | InfuraProvider | null,
  account: string | null,
  contractAddress: string | undefined,
  ABI: ContractInterface,
  withSignerIfPossible = true,
): Contract | null {
  return useMemo(() => {
    if (!contractAddress || !ABI || !provider) return null
    try {
      return getContract(
        contractAddress,
        ABI,
        provider,
        withSignerIfPossible && account ? account : undefined,
      )
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [contractAddress, ABI, provider, withSignerIfPossible, account])
}

import { ethers } from 'ethers'
import type { FC, PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type ContractABIContextValue = {
  contracts: Record<string, ethers.utils.Interface | null>
  loadContract(address: string, chainId: number): Promise<ethers.utils.Interface>
}

const ContractABIContext = createContext<ContractABIContextValue>({
  contracts: {},
  loadContract: Promise.resolve,
})

export const ContractABIProvider: FC<PropsWithChildren> = ({ children }) => {
  const [contracts, setMapping] = useState<Record<string, ethers.utils.Interface | null>>({})
  const loadContract = useCallback(async (address: string, chainId: number) => {
    try {
      // TODO: get API url and API key based on chainId and env vars or similar
      const res = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=SHWW69VK4Y77NUNYX1E3W7EMRBDWEB97EU`,
      ).then(res => res.json())
      if (res.status !== '1') throw new Error(res.result)

      const abi = JSON.parse(res.result)
      const contract = new ethers.utils.Interface(abi)
      setMapping(prev => ({ ...prev, [address]: contract }))
      return contract
    } catch (error) {
      setMapping(prev => ({ ...prev, [address]: null }))
      throw error
    }
  }, [])
  return (
    <ContractABIContext.Provider value={{ contracts, loadContract }}>
      {children}
    </ContractABIContext.Provider>
  )
}

export function useContract(
  address: string,
  chainId: number,
): { contract: ethers.utils.Interface | null; loading: boolean } {
  const { contracts, loadContract } = useContext(ContractABIContext)
  const [loading, setLoading] = useState(false)
  const contract = contracts[address]
  const loaded = contract !== undefined
  useEffect(() => {
    if (!loaded) {
      setLoading(true)
      loadContract(address, chainId).finally(() => setLoading(false))
    }
  }, [address, loaded, loadContract, chainId])
  return { contract, loading }
}

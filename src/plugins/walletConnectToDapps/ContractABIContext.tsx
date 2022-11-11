import { getConfig } from 'config'
import { ethers } from 'ethers'
import type { FC, PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type ContractABIContextValue = {
  contracts: Record<string, ethers.utils.Interface | null>
  loadContract(address: string): Promise<ethers.utils.Interface>
}

const ContractABIContext = createContext<ContractABIContextValue>({
  contracts: {},
  loadContract: Promise.resolve,
})

export const ContractABIProvider: FC<PropsWithChildren> = ({ children }) => {
  const [contracts, setMapping] = useState<Record<string, ethers.utils.Interface | null>>({})
  const loadContract = useCallback(async (address: string) => {
    try {
      const res = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${
          getConfig().REACT_APP_ETHERSCAN_API_KEY
        }`,
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

export function useContract(address: string): {
  contract: ethers.utils.Interface | null
  loading: boolean
} {
  const { contracts, loadContract } = useContext(ContractABIContext)
  const [loading, setLoading] = useState(false)
  const contract = contracts[address]
  const loaded = contract !== undefined
  useEffect(() => {
    if (!loaded) {
      setLoading(true)
      loadContract(address).finally(() => setLoading(false))
    }
  }, [address, loaded, loadContract])
  return { contract, loading }
}

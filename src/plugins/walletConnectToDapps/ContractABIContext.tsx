import { ethers } from 'ethers'
import { useMemo } from 'react'
import { useGetContractAbiQuery } from 'state/apis/abi/abiApi'

type UseContractReturn = {
  contract?: ethers.utils.Interface
  isLoading: boolean
  error: unknown
}
type UseContract = (address: string) => UseContractReturn

export const useContract: UseContract = address => {
  const { data: abi, isLoading, error } = useGetContractAbiQuery(address)
  const contract = useMemo(() => (abi ? new ethers.utils.Interface(abi) : undefined), [abi])
  return { contract, isLoading, error }
}

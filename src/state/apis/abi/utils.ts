import { ethers } from 'ethers'

type AbiApiByAddressArgs = {
  data?: any
  isLoading: boolean
  error?: unknown
}

type AbiApiByAddressReturn = {
  contract?: ethers.utils.Interface
  isLoading: boolean
  error: unknown
}

export const handleAbiApiResponse = ({
  data,
  isLoading,
  error,
}: AbiApiByAddressArgs): AbiApiByAddressReturn => ({
  contract: data ? new ethers.utils.Interface(data) : undefined,
  isLoading,
  error,
})

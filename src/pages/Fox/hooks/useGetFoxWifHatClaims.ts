import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

import { merkleData } from './foxwifhat-merkle'

export const foxWifHatClaimsQueryKey = ['getFoxWifHatClaims']

export const useGetFoxWifHatClaims = () => {
  const getFoxWifHatClaims = useCallback(async () => {
    return await Promise.resolve(merkleData)
  }, [])

  return useQuery({
    queryKey: foxWifHatClaimsQueryKey,
    queryFn: getFoxWifHatClaims,
  })
}

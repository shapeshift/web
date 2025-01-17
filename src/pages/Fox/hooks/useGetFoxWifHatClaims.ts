import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

import { merkleData } from './foxwifhat-merkle'

export const foxWifHatClaimsQueryKey = ['getFoxWifHatClaims']

export const useGetFoxWifHatClaims = () => {
  const getFoxWifHatClaims = useCallback(async () => {
    const addressLowercasedClaims = Object.entries(merkleData.claims).reduce(
      (acc, [address, claim]) => {
        acc[address.toLowerCase()] = claim
        return acc
      },
      {} as typeof merkleData.claims,
    )

    return await Promise.resolve({
      ...merkleData,
      claims: addressLowercasedClaims,
    })
  }, [])

  return useQuery({
    queryKey: foxWifHatClaimsQueryKey,
    queryFn: getFoxWifHatClaims,
  })
}

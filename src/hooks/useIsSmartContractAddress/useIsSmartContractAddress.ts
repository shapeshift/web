import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { isSmartContractAddress } from 'lib/address/utils'

export const useIsSmartContractAddress = (address: string) => {
  // Lowercase the address to ensure proper caching
  const userAddress = useMemo(() => address.toLowerCase(), [address])

  const queryParams = useMemo(() => {
    return {
      queryKey: [
        'isSmartContractAddress',
        {
          userAddress,
        },
      ],
      queryFn: () => isSmartContractAddress(userAddress),
      enabled: Boolean(userAddress.length),
    }
  }, [userAddress])

  const query = useQuery(queryParams)

  return query
}

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { isAddress } from 'viem'
import { isSmartContractAddress } from 'lib/address/utils'

export const useIsSmartContractAddress = (address: string) => {
  // Lowercase the address to ensure proper caching
  const userAddress = useMemo(() => address.toLowerCase(), [address])
  const query = useQuery({
    queryKey: [
      'isSmartContractAddress',
      {
        userAddress,
      },
    ],
    queryFn: () => isSmartContractAddress(userAddress),
    enabled: Boolean(userAddress.length && isAddress(address)),
  })

  return query
}

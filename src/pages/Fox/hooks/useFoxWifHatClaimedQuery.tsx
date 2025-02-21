import {
  FOX_WIF_HAT_MERKLE_DISTRIBUTOR_ABI,
  viemClientByNetworkId,
} from '@shapeshiftmonorepo/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getContract } from 'viem'
import { base } from 'viem/chains'

import { FOX_WIF_HAT_MERKLE_DISTRIBUTOR_CONTRACT } from '../constant'

const client = viemClientByNetworkId[base.id]

type FoxWifHatClaimedQueryKey = [
  'foxWifHatClaimed',
  {
    index: bigint | undefined
  },
]

type useFoxWifHatClaimedQueryQueryProps = {
  index: bigint | undefined
}

export const getFoxWifHatClaimedQueryKey = ({
  index,
}: useFoxWifHatClaimedQueryQueryProps): FoxWifHatClaimedQueryKey => [
  'foxWifHatClaimed',
  {
    index,
  },
]

export const getFoxWifHatClaimedQueryFn = ({ index }: useFoxWifHatClaimedQueryQueryProps) => {
  if (!index) return skipToken

  return async () => {
    try {
      return await getContract({
        address: FOX_WIF_HAT_MERKLE_DISTRIBUTOR_CONTRACT,
        abi: FOX_WIF_HAT_MERKLE_DISTRIBUTOR_ABI,
        client,
      }).read.isClaimed([index])
    } catch (err) {
      console.error(err)
      return false
    }
  }
}

export const useFoxWifHatClaimedQueryQuery = ({ index }: useFoxWifHatClaimedQueryQueryProps) => {
  const queryKey: FoxWifHatClaimedQueryKey = useMemo(() => {
    return getFoxWifHatClaimedQueryKey({ index })
  }, [index])

  const queryFn = useMemo(() => {
    return getFoxWifHatClaimedQueryFn({ index })
  }, [index])

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: index !== undefined,
  })

  return query
}

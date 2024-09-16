import { RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { contract } from '../constants'

type EarnedQueryKey = [
  'earned',
  { chainId: number; contractAddress: Address; stakingAssetAccountAddress?: string },
]

type UseEarnedQueryProps = {
  stakingAssetAccountAddress: string | undefined
}

export const getEarnedQueryKey = ({
  stakingAssetAccountAddress,
}: UseEarnedQueryProps): EarnedQueryKey => [
  'earned',
  {
    chainId: arbitrum.id,
    contractAddress: RFOX_PROXY_CONTRACT,
    stakingAssetAccountAddress,
  },
]

export const getEarnedQueryFn = ({ stakingAssetAccountAddress }: UseEarnedQueryProps) => {
  if (!stakingAssetAccountAddress) return skipToken

  return async () => {
    try {
      return await contract.read.earned([getAddress(stakingAssetAccountAddress)])
    } catch (err) {
      console.error(err)
      return 0n
    }
  }
}

export const useEarnedQuery = ({ stakingAssetAccountAddress }: UseEarnedQueryProps) => {
  const queryKey: EarnedQueryKey = useMemo(() => {
    return getEarnedQueryKey({ stakingAssetAccountAddress })
  }, [stakingAssetAccountAddress])

  const queryFn = useMemo(() => {
    return getEarnedQueryFn({ stakingAssetAccountAddress })
  }, [stakingAssetAccountAddress])

  const query = useQuery({
    queryKey,
    queryFn,
  })

  return query
}

import type { AssetId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { getRfoxContract } from '../constants'
import { getStakingContract } from '../helpers'

type EarnedQueryKey = [
  'earned',
  {
    chainId: number
    contractAddress: Address
    stakingAssetAccountAddress?: string
    stakingAssetId: AssetId
  },
]

type UseEarnedQueryProps = {
  stakingAssetAccountAddress: string | undefined
  stakingAssetId: AssetId
}

export const getEarnedQueryKey = ({
  stakingAssetAccountAddress,
  stakingAssetId,
}: UseEarnedQueryProps): EarnedQueryKey => [
  'earned',
  {
    chainId: arbitrum.id,
    contractAddress: getStakingContract(stakingAssetId),
    stakingAssetAccountAddress,
    stakingAssetId,
  },
]

export const getEarnedQueryFn = ({
  stakingAssetAccountAddress,
  stakingAssetId,
}: UseEarnedQueryProps) => {
  if (!stakingAssetId) return skipToken
  if (!stakingAssetAccountAddress) return skipToken

  return async () => {
    try {
      return await getRfoxContract(stakingAssetId).read.earned([
        getAddress(stakingAssetAccountAddress),
      ])
    } catch (err) {
      console.error(err)
      return 0n
    }
  }
}

export const useEarnedQuery = ({
  stakingAssetAccountAddress,
  stakingAssetId,
}: UseEarnedQueryProps) => {
  const queryKey: EarnedQueryKey = useMemo(() => {
    return getEarnedQueryKey({ stakingAssetAccountAddress, stakingAssetId })
  }, [stakingAssetAccountAddress, stakingAssetId])

  const queryFn = useMemo(() => {
    return getEarnedQueryFn({ stakingAssetAccountAddress, stakingAssetId })
  }, [stakingAssetAccountAddress, stakingAssetId])

  const query = useQuery({
    queryKey,
    queryFn,
  })

  return query
}

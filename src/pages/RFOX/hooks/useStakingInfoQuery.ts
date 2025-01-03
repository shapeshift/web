import type { AssetId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { getRfoxContract } from '../constants'
import { getRfoxProxyContract } from '../helpers'
import type { AbiStakingInfo } from '../types'

export type StakingInfoQueryKey = [
  'stakingInfo',
  {
    chainId: number
    contractAddress: Address
    stakingAssetAccountAddress?: string
    stakingAssetId?: AssetId
  },
]

type UseStakingInfoQueryProps<SelectData = AbiStakingInfo> = {
  stakingAssetAccountAddress: string | undefined
  stakingAssetId?: AssetId
  select?: (stakingInfo: AbiStakingInfo) => SelectData
}

export const getStakingInfoQueryKey = (
  stakingAssetAccountAddress: string | undefined,
  stakingAssetId: AssetId | undefined,
): StakingInfoQueryKey => {
  return [
    'stakingInfo',
    {
      chainId: arbitrum.id,
      contractAddress: getRfoxProxyContract(stakingAssetId),
      stakingAssetAccountAddress,
      stakingAssetId,
    },
  ]
}

export const getStakingInfoQueryFn = (
  stakingAssetAccountAddress: string,
  stakingAssetId?: AssetId,
) => {
  return () =>
    getRfoxContract(stakingAssetId).read.stakingInfo([getAddress(stakingAssetAccountAddress)])
}

export const useStakingInfoQuery = <SelectData = AbiStakingInfo>({
  stakingAssetAccountAddress,
  stakingAssetId,
  select,
}: UseStakingInfoQueryProps<SelectData>) => {
  const queryKey: StakingInfoQueryKey = useMemo(
    () => getStakingInfoQueryKey(stakingAssetAccountAddress, stakingAssetId),
    [stakingAssetAccountAddress, stakingAssetId],
  )

  const queryFn = useMemo(() => {
    return stakingAssetAccountAddress
      ? getStakingInfoQueryFn(stakingAssetAccountAddress, stakingAssetId)
      : skipToken
  }, [stakingAssetAccountAddress, stakingAssetId])

  const stakingInfoQuery = useQuery({
    queryKey,
    queryFn,
    select,
  })

  return { ...stakingInfoQuery, queryKey }
}

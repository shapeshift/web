import { skipToken, useQuery } from '@tanstack/react-query'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { contract } from '../constants'
import type { AbiStakingInfo } from '../types'

export type StakingInfoQueryKey = [
  'stakingInfo',
  {
    chainId: number
    contractAddress: Address
    stakingAssetAccountAddress?: string
  },
]

type UseStakingInfoQueryProps<SelectData = AbiStakingInfo> = {
  stakingAssetAccountAddress: string | undefined
  select?: (stakingInfo: AbiStakingInfo) => SelectData
}

export const getStakingInfoQueryKey = (
  stakingAssetAccountAddress: string | undefined,
): StakingInfoQueryKey => {
  return [
    'stakingInfo',
    {
      chainId: arbitrum.id,
      contractAddress: RFOX_PROXY_CONTRACT_ADDRESS,
      stakingAssetAccountAddress,
    },
  ]
}

export const getStakingInfoQueryFn = ({ stakingAssetAccountAddress }: UseStakingInfoQueryProps) => {
  return stakingAssetAccountAddress
    ? () => contract.read.stakingInfo([getAddress(stakingAssetAccountAddress)])
    : skipToken
}

export const useStakingInfoQuery = <SelectData = AbiStakingInfo>({
  stakingAssetAccountAddress,
  select,
}: UseStakingInfoQueryProps<SelectData>) => {
  const queryKey: StakingInfoQueryKey = useMemo(
    () => getStakingInfoQueryKey(stakingAssetAccountAddress),
    [stakingAssetAccountAddress],
  )

  const queryFn = useMemo(
    () => getStakingInfoQueryFn({ stakingAssetAccountAddress }),
    [stakingAssetAccountAddress],
  )

  const stakingInfoQuery = useQuery({
    queryKey,
    queryFn,
    select,
  })

  return { ...stakingInfoQuery, queryKey }
}

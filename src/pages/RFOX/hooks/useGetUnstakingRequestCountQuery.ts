import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import type { ReadContractQueryKey } from '@wagmi/core/query'
import { useMemo } from 'react'
import type { Address, ReadContractReturnType } from 'viem'
import { getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import type { Config } from 'wagmi'

import { getStakingContract } from '../helpers'

type GetUnstakingRequestCountQueryKey = ReadContractQueryKey<
  typeof RFOX_ABI,
  'getUnstakingRequestCount',
  readonly [Address],
  Config
>

type UnstakingRequestCount = ReadContractReturnType<
  typeof RFOX_ABI,
  'getUnstakingRequestCount',
  readonly [Address]
>

type UseGetUnstakingRequestCountQueryProps<SelectData = UnstakingRequestCount> = {
  stakingAssetAccountAddress: string | undefined
  stakingAssetId: AssetId | undefined
  select?: (unstakingRequestCount: UnstakingRequestCount) => SelectData
}

const client = viemClientByNetworkId[arbitrum.id]

export const getUnstakingRequestCountQueryKey = ({
  stakingAssetAccountAddress,
  stakingAssetId,
}: Omit<UseGetUnstakingRequestCountQueryProps, 'select'>): GetUnstakingRequestCountQueryKey => [
  'readContract',
  {
    address: stakingAssetId ? getStakingContract(stakingAssetId) : undefined,
    functionName: 'getUnstakingRequestCount',
    args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)],
    chainId: arbitrum.id,
  },
]

export const getUnstakingRequestCountQueryFn = ({
  stakingAssetAccountAddress,
  stakingAssetId,
}: Omit<UseGetUnstakingRequestCountQueryProps, 'select'>) => {
  if (!stakingAssetAccountAddress || !stakingAssetId) return skipToken

  return () =>
    readContract(client, {
      abi: RFOX_ABI,
      address: getStakingContract(stakingAssetId),
      functionName: 'getUnstakingRequestCount',
      args: [getAddress(stakingAssetAccountAddress)],
    })
}

export const useGetUnstakingRequestCountQuery = <SelectData = UnstakingRequestCount>({
  stakingAssetAccountAddress,
  stakingAssetId,
  select,
}: UseGetUnstakingRequestCountQueryProps<SelectData>) => {
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey = useMemo(() => {
    return getUnstakingRequestCountQueryKey({ stakingAssetAccountAddress, stakingAssetId })
  }, [stakingAssetAccountAddress, stakingAssetId])

  const queryFn = useMemo(() => {
    return getUnstakingRequestCountQueryFn({ stakingAssetAccountAddress, stakingAssetId })
  }, [stakingAssetAccountAddress, stakingAssetId])

  return useQuery({
    queryKey,
    queryFn,
    select,
    retry: false,
  })
}

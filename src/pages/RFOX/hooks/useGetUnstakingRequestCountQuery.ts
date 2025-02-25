import type { AssetId } from '@shapeshiftmonorepo/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftmonorepo/contracts'
import { skipToken } from '@tanstack/react-query'
import type { ReadContractQueryKey } from '@wagmi/core/query'
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

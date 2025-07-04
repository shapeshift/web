import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
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
  stakingAssetAccountId: string | undefined
  stakingAssetId: AssetId | undefined
  select?: (unstakingRequestCount: UnstakingRequestCount) => SelectData
}

const client = viemClientByNetworkId[arbitrum.id]

export const getUnstakingRequestCountQueryKey = ({
  stakingAssetAccountId,
  stakingAssetId,
}: Omit<UseGetUnstakingRequestCountQueryProps, 'select'>): GetUnstakingRequestCountQueryKey => [
  'readContract',
  {
    address: stakingAssetId ? getStakingContract(stakingAssetId) : undefined,
    functionName: 'getUnstakingRequestCount',
    args: [
      stakingAssetAccountId
        ? getAddress(fromAccountId(stakingAssetAccountId).account)
        : ('' as Address),
    ],
    chainId: arbitrum.id,
  },
]

export const getUnstakingRequestCountQueryFn = ({
  stakingAssetAccountId,
  stakingAssetId,
}: Omit<UseGetUnstakingRequestCountQueryProps, 'select'>) => {
  if (!stakingAssetAccountId || !stakingAssetId) return skipToken

  const stakingAssetAccountAddress = fromAccountId(stakingAssetAccountId).account

  return () =>
    readContract(client, {
      abi: RFOX_ABI,
      address: getStakingContract(stakingAssetId),
      functionName: 'getUnstakingRequestCount',
      args: [getAddress(stakingAssetAccountAddress)],
    })
}

// TODO(gomes): remove all implementation
export const newGetUnstakingRequestCountQueryFn = ({
  stakingAssetAccountId,
  stakingAssetId,
}: Omit<UseGetUnstakingRequestCountQueryProps, 'select'>) => {
  if (!stakingAssetAccountId || !stakingAssetId) return skipToken

  const stakingAssetAccountAddress = fromAccountId(stakingAssetAccountId).account

  return async () => {
    const count = await readContract(client, {
      abi: RFOX_ABI,
      address: getStakingContract(stakingAssetId),
      functionName: 'getUnstakingRequestCount',
      args: [getAddress(stakingAssetAccountAddress)],
    })

    return { count, stakingAssetId, stakingAssetAccountId }
  }
}

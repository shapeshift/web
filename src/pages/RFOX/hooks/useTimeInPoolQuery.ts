import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { arbitrumChainId, fromAccountId } from '@shapeshiftoss/caip'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getStakingContract } from '../helpers'

import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

export type TimeInPoolQueryKey = [
  'timeInPool',
  {
    stakingAssetAccountId?: string
    stakingAssetId?: AssetId
  },
]

export const getTimeInPoolQueryKey = ({
  stakingAssetAccountId,
  stakingAssetId,
}: {
  stakingAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId | undefined
}): TimeInPoolQueryKey => {
  return [
    'timeInPool',
    {
      stakingAssetAccountId,
      stakingAssetId,
    },
  ]
}

type UseTimeInPoolQueryProps<SelectData = bigint> = {
  stakingAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId
  select?: (timeInPoolSeconds: bigint) => SelectData
}

export const useTimeInPoolQuery = <SelectData = bigint>({
  stakingAssetAccountId,
  stakingAssetId,
  select,
}: UseTimeInPoolQueryProps<SelectData>) => {
  const provider = useMemo(() => {
    return assertGetEvmChainAdapter(arbitrumChainId).httpProvider as unchained.evm.arbitrum.V1Api
  }, [])

  const queryKey = useMemo(() => {
    return getTimeInPoolQueryKey({ stakingAssetAccountId, stakingAssetId })
  }, [stakingAssetAccountId, stakingAssetId])

  const queryFn = useMemo(() => {
    if (!stakingAssetAccountId) return skipToken

    return async () => {
      const stakingDuration = await provider.getRfoxStakingDuration({
        address: fromAccountId(stakingAssetAccountId).account,
      })

      return BigInt(stakingDuration[getStakingContract(stakingAssetId)] ?? 0)
    }
  }, [provider, stakingAssetAccountId, stakingAssetId])

  return useQuery({ queryKey, queryFn, select })
}

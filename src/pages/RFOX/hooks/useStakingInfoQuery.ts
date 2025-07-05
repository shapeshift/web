import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { getRfoxContract } from '../constants'
import { getStakingContract } from '../helpers'
import type { AbiStakingInfo } from '../types'

export type StakingInfoQueryKey = [
  'stakingInfo',
  {
    chainId: number
    contractAddress?: Address
    stakingAssetAccountId?: AccountId
    stakingAssetId?: AssetId
  },
]

type UseStakingInfoQueryProps<SelectData = AbiStakingInfo> = {
  accountId: AccountId | undefined
  stakingAssetId: AssetId | undefined
  select?: (stakingInfo: AbiStakingInfo) => SelectData
}

export const getStakingInfoQueryKey = ({
  stakingAssetAccountId,
  stakingAssetId,
}: {
  stakingAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId | undefined
}): StakingInfoQueryKey => {
  return [
    'stakingInfo',
    {
      chainId: arbitrum.id,
      contractAddress: stakingAssetId ? getStakingContract(stakingAssetId) : undefined,
      stakingAssetAccountId,
      stakingAssetId,
    },
  ]
}

export const getStakingInfoQueryFn = ({
  stakingAssetAccountId,
  stakingAssetId,
}: {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
}) => {
  return getRfoxContract(stakingAssetId).read.stakingInfo([
    getAddress(fromAccountId(stakingAssetAccountId).account),
  ])
}

export const useStakingInfoQuery = <SelectData = AbiStakingInfo>({
  accountId: stakingAssetAccountId,
  stakingAssetId,
  select,
}: UseStakingInfoQueryProps<SelectData>) => {
  const queryKey: StakingInfoQueryKey = useMemo(
    () => getStakingInfoQueryKey({ stakingAssetAccountId, stakingAssetId }),
    [stakingAssetAccountId, stakingAssetId],
  )

  const queryFn = useMemo(() => {
    return stakingAssetAccountId && stakingAssetId
      ? () =>
          getStakingInfoQueryFn({
            stakingAssetAccountId,
            stakingAssetId,
          })
      : skipToken
  }, [stakingAssetAccountId, stakingAssetId])

  return useQuery({
    queryKey,
    queryFn,
    select,
  })
}

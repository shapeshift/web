import type { AssetId } from '@shapeshiftmonorepo/caip'
import { RFOX_ABI } from '@shapeshiftmonorepo/contracts'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'

import { getStakingContract } from '../helpers'

import { formatSecondsToDuration } from '@/lib/utils/time'

export const useCooldownPeriodQuery = (stakingAssetId: AssetId) => {
  const cooldownPeriodQuery = useReadContract({
    abi: RFOX_ABI,
    address: getStakingContract(stakingAssetId),
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatSecondsToDuration(Number(data)),
    },
  })

  return cooldownPeriodQuery
}

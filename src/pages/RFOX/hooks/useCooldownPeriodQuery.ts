import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import { useReadContract } from 'wagmi'

import { getRfoxNetworkId, getStakingContract } from '../helpers'

import { formatSecondsToDuration } from '@/lib/utils/time'

export const useCooldownPeriodQuery = (stakingAssetId: AssetId) => {
  const cooldownPeriodQuery = useReadContract({
    abi: RFOX_ABI,
    address: getStakingContract(stakingAssetId),
    functionName: 'cooldownPeriod',
    chainId: getRfoxNetworkId(stakingAssetId),
    query: {
      staleTime: Infinity,
      select: data => {
        const cooldownPeriod = formatSecondsToDuration(Number(data))
        return {
          cooldownPeriod,
          cooldownPeriodSeconds: Number(data),
        }
      },
    },
  })

  return cooldownPeriodQuery
}

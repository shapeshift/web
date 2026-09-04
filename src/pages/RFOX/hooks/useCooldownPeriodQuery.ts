import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
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
      // Ops set this on chain, so it cannot be treated as immutable - notably it is zeroed at the
      // rFOX migration, which the UI keys un-staking off
      staleTime: 60 * 1000, // 1 minute in milliseconds
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

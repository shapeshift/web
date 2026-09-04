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
      // rFOX migration, which the UI keys un-staking off.
      staleTime: 60 * 1000, // 1 minute in milliseconds
      // refetchOnMount and refetchOnWindowFocus are both disabled app wide, so without its own
      // triggers a stale value would persist until a full page reload.
      refetchOnMount: true,
      // Independent of the above - the poll is paused while the tab is in the background, so this
      // catches a change made while the user was away without waiting for the next tick
      refetchOnWindowFocus: true,
      // Only poll while a cooldown is actually set. The transition worth catching is it being
      // zeroed at the migration, so polling stops for good once that is read back rather than
      // running forever for an event that has already happened.
      refetchInterval: query => (query.state.data === 0n ? false : 60 * 1000),
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

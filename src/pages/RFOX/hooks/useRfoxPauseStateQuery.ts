import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'

import { getRfoxNetworkId, getStakingContract } from '../helpers'

export type RfoxPauseState = {
  isStakingPaused: boolean
  isUnstakingPaused: boolean
  isWithdrawalsPaused: boolean
}

const DEFAULT_PAUSE_STATE: RfoxPauseState = {
  isStakingPaused: false,
  isUnstakingPaused: false,
  isWithdrawalsPaused: false,
}

export const useRfoxPauseStateQuery = (stakingAssetId: AssetId) => {
  const contracts = useMemo(() => {
    const address = getStakingContract(stakingAssetId)
    const chainId = getRfoxNetworkId(stakingAssetId)

    return [
      { abi: RFOX_ABI, address, chainId, functionName: 'paused' },
      { abi: RFOX_ABI, address, chainId, functionName: 'stakingPaused' },
      { abi: RFOX_ABI, address, chainId, functionName: 'unstakingPaused' },
      { abi: RFOX_ABI, address, chainId, functionName: 'withdrawalsPaused' },
    ] as const
  }, [stakingAssetId])

  return useReadContracts({
    contracts,
    allowFailure: false,
    query: {
      staleTime: 60 * 1000, // 1 minute in milliseconds
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      select: ([paused, stakingPaused, unstakingPaused, withdrawalsPaused]): RfoxPauseState => ({
        isStakingPaused: paused || stakingPaused,
        isUnstakingPaused: paused || unstakingPaused,
        isWithdrawalsPaused: paused || withdrawalsPaused,
      }),
    },
  })
}

export const selectPauseState = (pauseState: RfoxPauseState | undefined): RfoxPauseState =>
  pauseState ?? DEFAULT_PAUSE_STATE

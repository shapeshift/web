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

const PAUSED_PAUSE_STATE: RfoxPauseState = {
  isStakingPaused: true,
  isUnstakingPaused: true,
  isWithdrawalsPaused: true,
}

/**
 * Reads the on-chain pause flags for a staking contract, which gate whether each of stake, unstake
 * and claim can be actioned. Ops flips these directly on the contract, so this is what lets the UI
 * react to something like the Arbitrum sunset without a deploy.
 *
 * stake, unstake and withdraw each carry the contract wide `whenNotPaused` on top of their own
 * flag, so the global pause is folded into all three rather than reported separately.
 */
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
    // A call failing on its own would read as not paused, and would not be retried either
    allowFailure: false,
    query: {
      staleTime: 60 * 1000, // 1 minute in milliseconds
      select: ([paused, stakingPaused, unstakingPaused, withdrawalsPaused]): RfoxPauseState => ({
        isStakingPaused: paused || stakingPaused,
        isUnstakingPaused: paused || unstakingPaused,
        isWithdrawalsPaused: paused || withdrawalsPaused,
      }),
    },
  })
}

// An unknown pause state counts as paused - the contract reverts either way, so guessing the other
// way only costs the user a gas estimate and an error at execution
export const selectPauseState = (pauseState: RfoxPauseState | undefined): RfoxPauseState =>
  pauseState ?? PAUSED_PAUSE_STATE

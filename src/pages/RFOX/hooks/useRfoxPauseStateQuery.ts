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

/**
 * Reads the on-chain pause flags for a staking contract, which gate whether each of stake, unstake
 * and claim can be actioned. Ops flips these directly on the contract, so this is what lets the UI
 * react to something like the Arbitrum sunset without a deploy.
 */
export const useRfoxPauseStateQuery = (stakingAssetId: AssetId) => {
  const contracts = useMemo(() => {
    const address = getStakingContract(stakingAssetId)
    const chainId = getRfoxNetworkId(stakingAssetId)

    return [
      { abi: RFOX_ABI, address, chainId, functionName: 'stakingPaused' },
      { abi: RFOX_ABI, address, chainId, functionName: 'unstakingPaused' },
      { abi: RFOX_ABI, address, chainId, functionName: 'withdrawalsPaused' },
    ] as const
  }, [stakingAssetId])

  return useReadContracts({
    contracts,
    query: {
      staleTime: 60 * 1000, // 1 minute in milliseconds
      select: ([stakingPaused, unstakingPaused, withdrawalsPaused]): RfoxPauseState => ({
        isStakingPaused: Boolean(stakingPaused.result),
        isUnstakingPaused: Boolean(unstakingPaused.result),
        isWithdrawalsPaused: Boolean(withdrawalsPaused.result),
      }),
    },
  })
}

export const selectPauseState = (pauseState: RfoxPauseState | undefined): RfoxPauseState =>
  pauseState ?? DEFAULT_PAUSE_STATE

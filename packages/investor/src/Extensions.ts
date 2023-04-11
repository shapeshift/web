import type { BigNumber } from 'bignumber.js'

export type FeePriority = 'fast' | 'average' | 'slow'

export interface ApprovalRequired<T> {
  isApprovalRequired: true
  allowance: (address: string) => Promise<BigNumber>
  prepareApprove: (address: string) => Promise<T>
}

/*
 As we implement more single-sided staking protocols, we may want some standard
 interfaces for common behavior. We can create Extension interfaces here that
 Opportunities can implement

 Examples:

  export interface RebasingToken {}

  export interface ClaimableReward {
    isRewardClaimable: true
    claim: () => Promise<unknown>

    readonly rewardAsset: {
      assetId: string
      balance: BigNumber
    }
  }

  export interface DelayedWithdrawal {
    delayInMinutes: number // 14 * 24 * 60 = 14 days
    inProgressWithdrawals: []
    withdrawWithDelay: () => Promise<unknown>
  }
*/

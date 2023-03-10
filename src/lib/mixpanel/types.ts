import type { AssetId } from '@shapeshiftoss/caip'
import type Mixpanel from 'mixpanel-browser'
import type {
  LpEarnOpportunityType,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
export type MixPanelType = typeof Mixpanel | undefined

export enum MixPanelEvents {
  DepositContinue = 'Deposit Continue',
  DepositApprove = 'Deposit Approve',
  DepositConfirm = 'Deposit Confirm',
  DepositSuccess = 'Deposit Success',
  DustConfirm = 'Dust Confirm',
  WithdrawContinue = 'Withdraw Continue',
  WithdrawApprove = 'Withdraw Approve',
  WithdrawConfirm = 'Withdraw Confirm',
  WithdrawSuccess = 'Withdraw Success',
  ClaimConfirm = 'Claim Confirm',
  ClaimSuccess = 'Claim Success',
  ClickOpportunity = 'Click Opportunity',
  InsufficientFunds = 'Insufficient Funds',
}

export type trackOpportunityProps = {
  opportunity: StakingEarnOpportunityType | LpEarnOpportunityType
  cryptoAmounts: {
    assetId: AssetId
    amountCryptoHuman: string | number
    fiatAmount?: string | number
  }[]
  fiatAmounts: string[] | number[]
}

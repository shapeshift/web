import type Mixpanel from 'mixpanel-browser'
export type MixPanelType = typeof Mixpanel | undefined

export enum MixPanelEvents {
  DepositContinue = 'Deposit Continue',
  DepositApprove = 'Deposit Approve',
  DepositConfirm = 'Deposit Confirm',
  DepositSuccess = 'Deposit Success',
  WithdrawContinue = 'Withdraw Continue',
  WithdrawApprove = 'Withdraw Approve',
  WithdrawConfirm = 'Withdraw Confirm',
  WithdrawSuccess = 'Withdraw Success',
  ClaimConfirm = 'Claim Confirm',
  ClaimSuccess = 'Claim Success',
  ClickOpportunity = 'Click Opportunity',
}

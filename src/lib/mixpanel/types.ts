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

export type AnonymizedPortfolio = {
  hashedWalletId: string // e.g. 2398734895
  // walletType: KeyManager // e.g. 'Native' | 'Metamask' | 'WalletConnect'
  chains: string[] // e.g. ['Bitcoin', 'Ethereum']
  assets: string[] // e.g. ['Bitcoin.BTC', 'Ethereum.ETH', 'Ethereum.USDC']
  portfolioBalance: string // e.g. '420.69'
  assetBalances: Record<string, string> // e.g. { 'Bitcoin.BTC': 0.1, 'Ethereum.ETH': 2.13, 'Ethereum.USDC': 420.69 }
  chainBalances: Record<string, string> // e.g. { 'Bitcoin': 0.1, 'Ethereum': 10.123 }
}

import type { AssetId } from '@shapeshiftoss/caip'
import type Mixpanel from 'mixpanel-browser'
import type {
  LpEarnOpportunityType,
  OpportunityMetadata,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'

export type MixPanelType = typeof Mixpanel

export enum MixPanelEvent {
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
  ClickNft = 'Click NFT',
  InsufficientFunds = 'Insufficient Funds',
  BorrowPreview = 'Borrow Preview',
  RepayPreview = 'Repay Preview',
  TradePreview = 'Trade Preview',
  TradeConfirm = 'Trade Confirm',
  BorrowConfirm = 'Borrow Confirm',
  RepayConfirm = 'Repay Confirm',
  TradeConfirmSecondHop = 'Trade Confirm Second Hop',
  TradeSuccess = 'Trade Success',
  ThorDiscountTradeSuccess = 'Thor Discount Trade Success',
  ThorDiscountTradeFailed = 'Thor Discount Trade Failed',
  ThorDiscountTradeConfirm = 'Thor Discount Trade Confirm',
  ThorDiscountTradeConfirmSecondHop = 'Thor Discount Trade Second Hop',
  BorrowSuccess = 'Borrow Success',
  RepaySuccess = 'Repay Success',
  TradeFailed = 'Trade Failed',
  ConnectWallet = 'Connect Wallet',
  SwitchWallet = 'Switch Wallet',
  DisconnectWallet = 'Disconnect Wallet',
  FiatRamp = 'Fiat Ramp',
  NativeImportSeed = 'Native Import Seed',
  NativeImportKeystore = 'Native Import Keystore',
  NativeCreate = 'Native Create',
  Click = 'Click',
  ClickdApp = 'Click dApp',
  Error = 'Error',
  PageView = 'Page View',
  QuotesReceived = 'Quotes Received',
  SnapInstalled = 'Snap Installed',
  StartAddSnap = 'Start Add Snap',
  LpDepositPreview = 'LP Deposit Preview',
  LpDepositConfirm = 'LP Deposit Confirm',
  LpDepositInitiated = 'LP Deposit Initiated',
  LpDepositSuccess = 'LP Deposit Success',
  LpDepositFailed = 'LP Deposit Failed',
  LpWithdrawPreview = 'LP Withdraw Preview',
  LpWithdrawConfirm = 'LP Withdraw Confirm',
  LpWithdrawInitiated = 'LP Withdraw Initiated',
  LpWithdrawSuccess = 'LP Withdraw Success',
  LpWithdrawFailed = 'LP Withdraw Failed',
  LpIncompleteDepositConfirm = 'LP Incomplete Deposit Confirm',
  LpIncompleteWithdrawPreview = 'LP Incomplete Withdraw Preview',
  LpIncompleteWithdrawConfirm = 'LP Incomplete Withdraw Confirm',
  CustomAssetAdded = 'Custom Asset Added',
  ToggleWatchAsset = 'Toggle Watch Asset',
  LimitOrderPlaced = 'Limit Order Placed',
  LimitOrderCanceled = 'Limit Order Canceled',
}

export type TrackOpportunityProps = {
  opportunity: StakingEarnOpportunityType | LpEarnOpportunityType | OpportunityMetadata
  cryptoAmounts?: {
    assetId: AssetId
    amountCryptoHuman: string | number
    fiatAmount?: string | number
  }[]
  fiatAmounts?: string[] | number[]
  element?: string
}

export type AnonymizedPortfolio = {
  'Has Crypto Balance': boolean
  'Is Mobile': boolean
  'Wallet ID': string // e.g. 2398734895
  'Wallet Name': string // e.g. 'Native' | 'Metamask' | 'WalletConnect'
  Chains: string[] // e.g. ['Bitcoin', 'Ethereum']
  Assets: string[] // e.g. ['Bitcoin.BTC', 'Ethereum.ETH', 'Ethereum.USDC']
  'Portfolio Balance': number // e.g. '420.69'
  'Asset Balances': Record<string, number> // e.g. { 'Bitcoin.BTC': 0.1, 'Ethereum.ETH': 2.13, 'Ethereum.USDC': 420.69 }
  'Chain Balances': Record<string, number> // e.g. { 'Bitcoin': 0.1, 'Ethereum': 10.123 }
}

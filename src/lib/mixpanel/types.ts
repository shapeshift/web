import type { AssetId } from '@shapeshiftoss/caip'
import type Mixpanel from 'mixpanel-browser'
import type {
  LpEarnOpportunityType,
  OpportunityMetadata,
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
  ClickNft = 'Click NFT',
  InsufficientFunds = 'Insufficient Funds',
  TradePreview = 'Trade Preview',
  TradeConfirm = 'Trade Confirm',
  TradeSuccess = 'Trade Success',
  TradeFailed = 'Trade Failed',
  ConnectWallet = 'Connect Wallet',
  SwitchWallet = 'Switch Wallet',
  DisconnectWallet = 'Disconnect Wallet',
  FiatRamp = 'Fiat Ramp',
  NativeImport = 'Native Import',
  NativeCreate = 'Native Create',
  Click = 'Click',
  ClickdApp = 'Click dApp',
  ConnectedTodApp = 'Connected to dApp',
  Error = 'Error',
  PageView = 'Page View',
  SwapperApiRequest = 'Swapper API request',
  QuotesReceived = 'Quotes Received',
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

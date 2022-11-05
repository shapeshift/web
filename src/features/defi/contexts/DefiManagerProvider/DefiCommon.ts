import type { AccountId, ChainId } from '@keepkey/caip'

export enum DefiType {
  LiquidityPool = 'liquidity_pool',
  Vault = 'vault',
  Staking = 'staking',
  Farming = 'farming',
  TokenStaking = 'token_staking',
}

export enum DefiProvider {
  Idle = 'idle',
  Yearn = 'yearn',
  ShapeShift = 'ShapeShift',
  FoxEthLP = 'UNI V2',
  // just to make sure ShapeShift provider (for foxy) is not used
  FoxFarming = 'ShapeShift Farming',
  Cosmos = 'Cosmos',
  Osmosis = 'Osmosis',
}

export enum DefiAction {
  Overview = 'overview',
  Deposit = 'deposit',
  Withdraw = 'withdraw',
  GetStarted = 'get-started',
  Claim = 'claim',
}

export enum DefiStep {
  Info = 'info',
  Approve = 'approve',
  Confirm = 'confirm',
  Status = 'status',
}

export type DefiParams = {
  provider: DefiProvider
  earnType: DefiType
  action: DefiAction
}

export type DefiQueryParams = {
  defaultAccountId?: AccountId
  chainId: ChainId
  contractAddress: string
  assetReference: string
  rewardId: string
  modal: string
  provider: string
}

export type DefiManagerProviderProps = {
  children: React.ReactNode
}

export type DefiManagerContextProps = {
  open(): void
  close(): void
}

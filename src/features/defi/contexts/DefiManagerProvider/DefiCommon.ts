import type { AccountId, AssetNamespace, AssetReference, ChainId } from '@shapeshiftoss/caip'

export enum DefiType {
  LiquidityPool = 'lp',
  Vault = 'vault',
  Staking = 'staking',
  TokenStaking = 'token_staking',
}

export enum DefiProvider {
  Idle = 'idle',
  Yearn = 'yearn',
  ShapeShift = 'ShapeShift',
  EthFoxStaking = 'ETH/FOX Staking',
  UniV2 = 'Uniswap V2',
  Cosmos = 'Cosmos',
  Osmosis = 'Osmosis',
  ThorchainSavers = 'THORChain Savers',
}

export enum DefiAction {
  Overview = 'overview',
  Deposit = 'deposit',
  Withdraw = 'withdraw',
  GetStarted = 'get-started',
  Claim = 'claim',
  SendDust = 'send-dust',
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
  accountId?: AccountId
  defaultAccountId?: AccountId
  chainId: ChainId
  highestBalanceAccountAddress?: string
  contractAddress: string
  assetNamespace: AssetNamespace
  assetReference: AssetReference
  rewardId: string
  modal: string
  provider: string
  type: string
}

export type DefiManagerProviderProps = {
  children: React.ReactNode
}

export type DefiManagerContextProps = {
  open(): void
  close(): void
}

import { ChainTypes } from '@shapeshiftoss/types'

export enum DefiType {
  Pool = 'pool',
  Vault = 'vault',
  Staking = 'staking',
  Farming = 'farming',
  TokenStaking = 'token_staking',
}

export enum DefiProvider {
  Yearn = 'yearn',
  ShapeShift = 'ShapeShift',
}

export enum DefiAction {
  Overview = 'overview',
  Deposit = 'deposit',
  Withdraw = 'withdraw',
  GetStarted = 'get-started',
}

export type DefiParams = {
  provider: DefiProvider
  earnType: DefiType
  action: DefiAction
}

export type DefiQueryParams = {
  chain: ChainTypes
  contractAddress: string
  tokenId: string
  rewardId: string
}

export type DefiManagerProviderProps = {
  children: React.ReactNode
}

export type DefiManagerContextProps = {
  open(): void
  close(): void
}

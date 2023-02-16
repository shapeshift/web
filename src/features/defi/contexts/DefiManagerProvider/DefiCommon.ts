import type { AccountId, AssetNamespace, AssetReference, ChainId } from '@shapeshiftoss/caip'

export enum DefiType {
  LiquidityPool = 'lp',
  Vault = 'vault',
  Staking = 'staking',
  TokenStaking = 'token_staking', // TODO(0xdef1cafe): delete - what is this?
}

export enum DefiProvider {
  Idle = 'idle',
  Yearn = 'yearn',
  ShapeShift = 'ShapeShift',
  FoxFarming = 'ShapeShift Farming',
  Cosmos = 'Cosmos',
  Osmosis = 'Osmosis',
  ThorchainSavers = 'THORChain Savers',
}

export const DefiProviderMetadata = {
  [DefiProvider.Idle]: {
    type: DefiProvider.Idle,
    icon: 'https://assets.coingecko.com/coins/images/13286/thumb/image.png?1655284075',
    name: 'Cosmos SDK Staking',
  },
  [DefiProvider.Yearn]: {
    type: DefiProvider.Yearn,
    icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e/logo.png',
    name: 'Idle Finance',
  },
  [DefiProvider.ShapeShift]: {
    type: DefiProvider.ShapeShift,
    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
    name: 'ShapeShift',
  },
  [DefiProvider.FoxFarming]: {
    type: DefiProvider.FoxFarming,
    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
    name: 'FOX Farming',
  },
  [DefiProvider.Cosmos]: {
    type: DefiProvider.Cosmos,
    icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
    name: 'Cosmos',
  },
  [DefiProvider.Osmosis]: {
    type: DefiProvider.Osmosis,
    icon: 'https://rawcdn.githack.com/cosmos/chain-registry/6561270d8e1f169774a3857756e9aecbbd762eb4/osmosis/images/osmo.png',
    name: 'Osmosis',
  },
  [DefiProvider.ThorchainSavers]: {
    type: DefiProvider.ThorchainSavers,
    icon: 'https://assets.coincap.io/assets/icons/rune@2x.png',
    name: 'Thorchain',
  },
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

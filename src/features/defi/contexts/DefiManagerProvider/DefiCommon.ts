import type { AccountId, AssetNamespace, AssetReference, ChainId } from '@shapeshiftoss/caip'
import IdleFinanceLogo from 'assets/idle-finance.png'
import { selectGetReadOnlyOpportunities } from 'state/slices/opportunitiesSlice/selectors/readonly'
import { store } from 'state/store'

export enum DefiType {
  LiquidityPool = 'lp',
  Staking = 'staking',
}

export const DefiTypeDisplayName = {
  [DefiType.LiquidityPool]: 'LP',
  [DefiType.Staking]: 'Staking',
}

export enum DefiProvider {
  Idle = 'idle',
  Yearn = 'yearn',
  ShapeShift = 'ShapeShift',
  EthFoxStaking = 'ETH/FOX Staking',
  UniV2 = 'Uniswap V2',
  CosmosSdk = 'Cosmos SDK',
  OsmosisLp = 'Osmosis LP',
  ThorchainSavers = 'THORChain Savers',
}

export type DefiProviderMetadata = {
  provider: string
  icon: string
  color: string
  url?: string
}

export const DEFI_PROVIDER_TO_METADATA: Record<DefiProvider, DefiProviderMetadata> = {
  [DefiProvider.Idle]: {
    provider: DefiProvider.Idle,
    icon: IdleFinanceLogo,
    color: '#1B14DC',
    url: 'https://idle.finance',
  },
  [DefiProvider.Yearn]: {
    provider: DefiProvider.Yearn,
    icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e/logo.png',
    color: '#000',
    url: 'https://yearn.finance',
  },
  [DefiProvider.ShapeShift]: {
    provider: DefiProvider.ShapeShift,
    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
    color: '#3761F9',
    url: 'https://app.shapeshift.com',
  },
  [DefiProvider.EthFoxStaking]: {
    provider: DefiProvider.EthFoxStaking,
    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
    color: '#00CD98',
    url: 'https://app.shapeshift.com',
  },
  [DefiProvider.UniV2]: {
    provider: DefiProvider.UniV2,
    icon: 'https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604',
    color: '#FD0078',
    url: 'https://app.uniswap.org',
  },
  [DefiProvider.CosmosSdk]: {
    provider: DefiProvider.CosmosSdk,
    icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
    color: '#C5B5F2',
    url: 'https://app.shapeshift.com',
  },
  [DefiProvider.OsmosisLp]: {
    provider: DefiProvider.OsmosisLp,
    icon: 'https://rawcdn.githack.com/cosmos/chain-registry/6561270d8e1f169774a3857756e9aecbbd762eb4/osmosis/images/osmo.png',
    color: '#6A02B5',
    url: 'https://app.osmosis.zone',
  },
  [DefiProvider.ThorchainSavers]: {
    provider: DefiProvider.ThorchainSavers,
    icon: 'https://assets.coincap.io/assets/icons/rune@2x.png',
    color: '#0CDBE0',
    url: 'https://app.shapeshift.com',
  },
}

export const getMetadataForProvider = (provider: string): DefiProviderMetadata | undefined => {
  if (Object.values(DefiProvider).includes(provider as DefiProvider)) {
    return DEFI_PROVIDER_TO_METADATA[provider as DefiProvider]
  }

  const readOnlyOpportunities = selectGetReadOnlyOpportunities(store.getState())

  const readOnlyOpportunityMetadata = readOnlyOpportunities.data?.metadataByProvider?.[provider]

  return readOnlyOpportunityMetadata
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

import type { AccountId, AssetNamespace, AssetReference, ChainId } from '@shapeshiftoss/caip'
import type { ReconciliationType } from 'features/defi/providers/thorchain-savers/components/ThorchainSaversManager/UtxoReconciliate/UtxoReconciliate'

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
  FoxFarming = 'ShapeShift Farming',
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
  UtxoReconciliate = 'utxo-reconciliate',
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

export type DefiQueryParamsBase = {
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
export type DefiQueryParams = DefiQueryParamsBase | ThorchainSaversDefiQueryParams

export type ThorchainSaversDefiQueryParams = DefiQueryParamsBase & {
  provider: DefiProvider.ThorchainSavers
  type: DefiType.Staking
  accountAddress: string
  reconciliationType: ReconciliationType
  cryptoAmount: string
  fiatAmount: string
  estimatedGasCrypto: string
}

export type DefiManagerProviderProps = {
  children: React.ReactNode
}

export type DefiManagerContextProps = {
  open(): void
  close(): void
}

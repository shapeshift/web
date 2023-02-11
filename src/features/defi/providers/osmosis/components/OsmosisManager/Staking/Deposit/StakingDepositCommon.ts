import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { DepositValues, Field as DepositField } from 'features/defi/components/Deposit/Deposit'
import type { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { BigNumber } from 'lib/bignumber/bignumber'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type SupportedOsmosisOpportunity = {
  type: DefiType
  provider: string
  version: string
  stakingToken: string
  chain: ChainId
  tvl: BigNumber
  apr: string
  expired: boolean
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type OsmosisStakingDepositValues = Omit<DepositValues, DepositField.Slippage> &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string // TODO: remove this property?
  }

export type OsmosisStakingDepositState = {
  osmosisOpportunity: SupportedOsmosisOpportunity
  accountId: AccountId | null
  deposit: OsmosisStakingDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export enum OsmosisStakingDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_ACCOUNT_ID = 'SET_ACCOUNT_ID',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOsmosisStakingOpportunitiesAction = {
  type: OsmosisStakingDepositActionType.SET_OPPORTUNITY
  payload: Partial<StakingEarnOpportunityType> | null
}

type SetDeposit = {
  type: OsmosisStakingDepositActionType.SET_DEPOSIT
  payload: Partial<OsmosisStakingDepositValues>
}

type SetAccountId = {
  type: OsmosisStakingDepositActionType.SET_ACCOUNT_ID
  payload: AccountId | null
}

type SetLoading = {
  type: OsmosisStakingDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: OsmosisStakingDepositActionType.SET_TXID
  payload: string
}

export type OsmosisStakingDepositActions =
  | SetOsmosisStakingOpportunitiesAction
  | SetDeposit
  | SetAccountId
  | SetLoading
  | SetTxid

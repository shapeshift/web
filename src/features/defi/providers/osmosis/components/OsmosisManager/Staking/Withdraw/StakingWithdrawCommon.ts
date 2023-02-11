import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { WithdrawType } from '@shapeshiftoss/types'
import type {
  Field as WithdrawField,
  WithdrawValues,
} from 'features/defi/components/Withdraw/Withdraw'
import type { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { BigNumber } from 'lib/bignumber/bignumber'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type SupportedOsmosisOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  stakingToken: string
  chain: ChainId
  tvl: BigNumber
  expired: boolean
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type OsmosisStakingWithdrawValues = Omit<WithdrawValues, WithdrawField.Slippage> &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
    withdrawType: WithdrawType
  }

export type OsmosisStakingWithdrawState = {
  osmosisOpportunity: SupportedOsmosisOpportunity
  accountId: AccountId | null
  withdraw: OsmosisStakingWithdrawValues
  loading: boolean
  txid: string | null
}
export enum OsmosisStakingWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_ACCOUNT_ID = 'SET_ACCOUNT_ID',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetVaultAction = {
  type: OsmosisStakingWithdrawActionType.SET_OPPORTUNITY
  payload: Partial<StakingEarnOpportunityType> | null
}

type SetWithdraw = {
  type: OsmosisStakingWithdrawActionType.SET_WITHDRAW
  payload: Partial<OsmosisStakingWithdrawValues>
}

type SetAccountId = {
  type: OsmosisStakingWithdrawActionType.SET_ACCOUNT_ID
  payload: AccountId
}

type SetLoading = {
  type: OsmosisStakingWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: OsmosisStakingWithdrawActionType.SET_TXID
  payload: string
}

export type OsmosisStakingWithdrawActions =
  | SetVaultAction
  | SetWithdraw
  | SetAccountId
  | SetLoading
  | SetTxid

import { DefiType } from '@shapeshiftoss/investor-foxy'
import { ChainTypes, WithdrawType } from '@shapeshiftoss/types'
import { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'

type SupportedFoxyOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  rewardToken: string
  stakingToken: string
  chain: ChainTypes
  tvl: BigNumber
  apy: string
  expired: boolean
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type FoxyWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

export type FoxyWithdrawState = {
  foxyOpportunity: SupportedFoxyOpportunity
  userAddress: string | null
  approve: EstimatedGas
  withdraw: FoxyWithdrawValues
  loading: boolean
  txid: string | null
  foxyFeePercentage: string
}

export const initialState: FoxyWithdrawState = {
  txid: null,
  foxyOpportunity: {
    contractAddress: '',
    stakingToken: '',
    provider: '',
    chain: ChainTypes.Ethereum,
    type: DefiType.TokenStaking,
    expired: false,
    version: '',
    rewardToken: '',
    tvl: bnOrZero(0),
    apy: '',
  },
  userAddress: null,
  loading: false,
  approve: {},
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
    withdrawType: WithdrawType.DELAYED,
  },
  foxyFeePercentage: '',
}

export enum FoxyWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_APPROVE = 'SET_APPROVE',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
  SET_FOXY_FEE = 'SET_FOXY_FEE',
}

type SetVaultAction = {
  type: FoxyWithdrawActionType.SET_OPPORTUNITY
  payload: SupportedFoxyOpportunity | null
}

type SetApprove = {
  type: FoxyWithdrawActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetWithdraw = {
  type: FoxyWithdrawActionType.SET_WITHDRAW
  payload: Partial<FoxyWithdrawValues>
}

type SetUserAddress = {
  type: FoxyWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: FoxyWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: FoxyWithdrawActionType.SET_TXID
  payload: string
}

type SetFoxyFee = {
  type: FoxyWithdrawActionType.SET_FOXY_FEE
  payload: string
}

export type FoxyWithdrawActions =
  | SetVaultAction
  | SetApprove
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetFoxyFee

export const reducer = (state: FoxyWithdrawState, action: FoxyWithdrawActions) => {
  switch (action.type) {
    case FoxyWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, foxyOpportunity: { ...state.foxyOpportunity, ...action.payload } }
    case FoxyWithdrawActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case FoxyWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case FoxyWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case FoxyWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case FoxyWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    case FoxyWithdrawActionType.SET_FOXY_FEE:
      return { ...state, foxyFeePercentage: action.payload }
    default:
      return state
  }
}

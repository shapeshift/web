import { DefiType } from '@shapeshiftoss/investor-foxy'
import { ChainTypes } from '@shapeshiftoss/types'
import { WithdrawType, WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
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

type FoxyWithdrawState = {
  foxyOpportunity: SupportedFoxyOpportunity
  userAddress: string | null
  approve: EstimatedGas
  withdraw: FoxyWithdrawValues
  loading: boolean
  pricePerShare: string
  txid: string | null
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
    apy: ''
  },
  userAddress: null,
  loading: false,
  approve: {},
  pricePerShare: '',
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
    withdrawType: WithdrawType.Instant
  }
}

export enum FoxyWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_APPROVE = 'SET_APPROVE',
  SET_LOADING = 'SET_LOADING',
  SET_PRICE_PER_SHARE = 'SET_PRICE_PER_SHARE',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS'
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

type SetPricePerShare = {
  type: FoxyWithdrawActionType.SET_PRICE_PER_SHARE
  payload: string
}

type SetTxid = {
  type: FoxyWithdrawActionType.SET_TXID
  payload: string
}

type FoxyWithdrawActions =
  | SetVaultAction
  | SetApprove
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetPricePerShare
  | SetTxid

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
    case FoxyWithdrawActionType.SET_PRICE_PER_SHARE:
      return { ...state, pricePerShare: action.payload }
    case FoxyWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}

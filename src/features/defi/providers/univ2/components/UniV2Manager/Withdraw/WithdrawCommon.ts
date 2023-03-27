type EstimatedGas = {
  estimatedGasCryptoPrecision?: string
}

type WithdrawValues = {
  lpAmount: string
  lpFiatAmount: string
  asset1Amount: string
  asset0Amount: string
}

type UniV2WithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFeeCryptoPrecision: string
  }

export type UniV2WithdrawState = {
  approve: EstimatedGas
  withdraw: UniV2WithdrawValues
  loading: boolean
  txid: string | null
}

export enum UniV2WithdrawActionType {
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_APPROVE = 'SET_APPROVE',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetWithdraw = {
  type: UniV2WithdrawActionType.SET_WITHDRAW
  payload: Partial<UniV2WithdrawValues>
}

type SetLoading = {
  type: UniV2WithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: UniV2WithdrawActionType.SET_TXID
  payload: string
}

type SetApprove = {
  type: UniV2WithdrawActionType.SET_APPROVE
  payload: EstimatedGas
}

export type UniV2WithdrawActions = SetWithdraw | SetApprove | SetLoading | SetTxid

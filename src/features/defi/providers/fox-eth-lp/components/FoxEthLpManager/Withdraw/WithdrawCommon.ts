type EstimatedGas = {
  estimatedGasCryptoPrecision?: string
}

type WithdrawValues = {
  lpAmount: string
  lpFiatAmount: string
  foxAmount: string
  ethAmount: string
}

type FoxEthLpWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFeeCryptoPrecision: string
  }

export type FoxEthLpWithdrawState = {
  approve: EstimatedGas
  withdraw: FoxEthLpWithdrawValues
  loading: boolean
  txid: string | null
}

export enum FoxEthLpWithdrawActionType {
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_APPROVE = 'SET_APPROVE',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetWithdraw = {
  type: FoxEthLpWithdrawActionType.SET_WITHDRAW
  payload: Partial<FoxEthLpWithdrawValues>
}

type SetLoading = {
  type: FoxEthLpWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: FoxEthLpWithdrawActionType.SET_TXID
  payload: string
}

type SetApprove = {
  type: FoxEthLpWithdrawActionType.SET_APPROVE
  payload: EstimatedGas
}

export type FoxEthLpWithdrawActions = SetWithdraw | SetApprove | SetLoading | SetTxid

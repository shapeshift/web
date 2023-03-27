type EstimatedGas = {
  estimatedGasCryptoPrecision?: string
}

type DepositValues = {
  asset1FiatAmount: string
  asset1CryptoAmount: string
  asset0FiatAmount: string
  asset0CryptoAmount: string
}

type UniV2DepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFeeCryptoPrecision: string
  }

export type UniV2DepositState = {
  approve: EstimatedGas
  deposit: UniV2DepositValues
  loading: boolean
  txid: string | null
}

export enum UniV2DepositActionType {
  SET_APPROVE = 'SET_APPROVE',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetApprove = {
  type: UniV2DepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetDeposit = {
  type: UniV2DepositActionType.SET_DEPOSIT
  payload: Partial<UniV2DepositValues>
}

type SetLoading = {
  type: UniV2DepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: UniV2DepositActionType.SET_TXID
  payload: string
}

export type UniV2DepositActions = SetApprove | SetDeposit | SetLoading | SetTxid

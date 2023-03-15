type EstimatedGas = {
  estimatedGasCrypto?: string
}

type DepositValues = {
  foxFiatAmount: string
  foxCryptoAmount: string
  ethFiatAmount: string
  ethCryptoAmount: string
}

type FoxEthLpDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

export type FoxEthLpDepositState = {
  approve: EstimatedGas
  deposit: FoxEthLpDepositValues
  loading: boolean
  txid: string | null
}

export enum FoxEthLpDepositActionType {
  SET_APPROVE = 'SET_APPROVE',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetApprove = {
  type: FoxEthLpDepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetDeposit = {
  type: FoxEthLpDepositActionType.SET_DEPOSIT
  payload: any
}

type SetLoading = {
  type: FoxEthLpDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: FoxEthLpDepositActionType.SET_TXID
  payload: string
}

export type FoxEthLpDepositActions = SetApprove | SetDeposit | SetLoading | SetTxid

import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BigNumber } from 'bignumber.js'

export type Allowanceinput = {
  spenderAddress: string
  tokenContractAddress: string
  userAddress: string
}

export type ApproveInput = {
  accountNumber?: number
  dryRun?: boolean
  spenderAddress: string
  tokenContractAddress: string
  userAddress: string
  wallet: HDWallet
}

export type ApproveEstimatedGasInput = Pick<
  ApproveInput,
  'spenderAddress' | 'userAddress' | 'tokenContractAddress'
>

export type TxInput = {
  accountNumber?: number
  dryRun?: boolean
  tokenContractAddress: string
  userAddress: string
  vaultAddress: string
  wallet: HDWallet
  amountDesired: BigNumber
}

export type TxEstimatedGasInput = Pick<TxInput, 'vaultAddress' | 'userAddress' | 'amountDesired'>

export type BalanceInput = {
  userAddress: string
  vaultAddress: string
}

export type TokenInput = {
  vaultAddress: string
}

export type APYInput = {
  vaultAddress: string
}

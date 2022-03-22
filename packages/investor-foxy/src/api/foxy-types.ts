import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'

import { WithdrawType } from '../constants'

export type FoxyAddressesType = {
  staking: string
  liquidityReserve: string
  fox: string
  foxy: string
  version: number
}[]

export type TxReceipt = { txid: string }

export type AllowanceInput = {
  tokenContractAddress: string
  contractAddress: string
  userAddress: string
}

export type ApproveInput = {
  accountNumber?: number
  dryRun?: boolean
  tokenContractAddress: string
  contractAddress: string
  userAddress: string
  wallet: HDWallet
}

export type EstimateGasApproveInput = Pick<
  ApproveInput,
  'userAddress' | 'tokenContractAddress' | 'contractAddress'
>

export type TxInput = {
  accountNumber?: number
  dryRun?: boolean
  tokenContractAddress?: string
  userAddress: string
  contractAddress: string
  wallet: HDWallet
  amountDesired: BigNumber
}

export type TxInputWithoutAmount = Pick<TxInput, Exclude<keyof TxInput, 'amountDesired'>>

export type TxInputWithoutAmountAndWallet = Pick<
  TxInputWithoutAmount,
  Exclude<keyof TxInputWithoutAmount, 'wallet'>
>

export type WithdrawInput = Omit<TxInput, 'amountDesired'> & {
  type: WithdrawType
  amountDesired?: BigNumber
}

export type FoxyOpportunityInputData = {
  tvl: BigNumber
  apy: string
  expired: boolean
  staking: string
  foxy: string
  fox: string
  liquidityReserve: string
}

export type EstimateGasTxInput = Pick<
  TxInput,
  'tokenContractAddress' | 'contractAddress' | 'userAddress' | 'amountDesired'
>

export type BalanceInput = {
  userAddress: string
  tokenContractAddress: string
}

export type TokenAddressInput = {
  tokenContractAddress: string
}

export type InstantUnstakeFeeInput = {
  contractAddress: string
}

export type ClaimWithdrawal = TxInputWithoutAmount & {
  claimAddress?: string
}

export type WithdrawInfo = {
  amount: string
  gons: string
  expiry: string
  releaseTime: string
}

export type SignAndBroadcastPayload = {
  bip44Params: BIP44Params
  chainId: number
  data: string
  estimatedGas: string
  gasPrice: string
  nonce: string
  to: string
  value: string
}

export type SignAndBroadcastTx = {
  payload: SignAndBroadcastPayload
  wallet: HDWallet
  dryRun: boolean
}

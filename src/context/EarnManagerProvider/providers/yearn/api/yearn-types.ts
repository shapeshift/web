import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP32Params } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'

export type Allowanceinput = {
  spenderAddress: string
  tokenContractAddress: string
  userAddress: string
}

export type ApproveInput = {
  bip32Params: BIP32Params
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

export type DepositInput = {
  bip32Params: BIP32Params
  dryRun?: boolean
  tokenContractAddress: string
  userAddress: string
  vaultAddress: string
  wallet: HDWallet
  amountDesired: BigNumber
}

export type WithdrawInput = {
  bip32Params?: BIP32Params
  dryRun?: boolean
  tokenContractAddress: string
  userAddress: string
  vaultAddress?: string
  wallet?: HDWallet
  amountDesired: BigNumber
}

export type BalanceInput = {
  userAddress: string
  vaultAddress: string
}

export type APYInput = {
  vaultAddress: string
}

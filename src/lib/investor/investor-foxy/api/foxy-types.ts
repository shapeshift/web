import type { ContractInteraction, FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, KnownChainIds, WithdrawType } from '@shapeshiftoss/types'
import type { BigNumber } from 'bignumber.js'
import type { Contract } from 'ethers'

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
  amount?: string
  bip44Params: Bip44Params
  dryRun?: boolean
  tokenContractAddress: string
  contractAddress: string
  userAddress: string
  wallet: ETHWallet
}

export type EstimateApproveFeesInput = Pick<
  ApproveInput,
  'userAddress' | 'tokenContractAddress' | 'contractAddress'
>

export type TxInput = {
  bip44Params: Bip44Params
  dryRun?: boolean
  tokenContractAddress?: string
  userAddress: string
  contractAddress: string
  wallet: ETHWallet
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

export type EstimateWithdrawFeesInput = Omit<WithdrawInput, 'wallet'>

export type FoxyOpportunityInputData = {
  tvl: BigNumber
  apy: string
  expired: boolean
  staking: string
  foxy: string
  fox: string
  liquidityReserve: string
}

export type EstimateFeesTxInput = Pick<
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

export type ContractAddressInput = {
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
  bip44Params: Bip44Params
  chainId: number
  data: string
  estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
  to: string
  value: string
}

export type SignAndBroadcastTx = {
  payload: SignAndBroadcastPayload
  wallet: ETHWallet
  dryRun: boolean
  receiverAddress: string | ContractInteraction
}

export type Signature = {
  v: number
  r: string
  s: string
}

export type GetTokeRewardAmount = Signature & {
  recipient: Recipient
}

export type TokeClaimIpfs = {
  payload: { amount: string; wallet: string; cycle: number; chainId: number }
  signature: Signature
}

export type Recipient = {
  chainId: number
  cycle: number
  wallet: string // address that's claiming.  Weird Tokemak naming convention
  amount: string
}

export type StakingContract = {
  stakingContract: Contract
}

// this comment only exists to publish this package - delete me if you see me
export type CanClaimWithdrawParams = {
  contractAddress: string
  userAddress: string
}

export type Epoch = {
  length: BigInt
  number: BigInt
  endBlock: BigInt
  distribute: BigInt
}

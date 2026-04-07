import type { Address, Hex } from 'viem'

export type StargateTransactionMetadata = {
  to: Address
  data: Hex
  value: string
  gasLimit: string
}

export type StargateSendParam = {
  dstEid: number
  to: Hex
  amountLD: bigint
  minAmountLD: bigint
  extraOptions: Hex
  composeMsg: Hex
  oftCmd: Hex
}

export type StargateQuoteOFTResponse = {
  minAmountLD: bigint
  maxAmountLD: bigint
  detailDstAmountLD: bigint
  detailFeeAmountLD: bigint
}

export type StargateMessagingFee = {
  nativeFee: bigint
  lzTokenFee: bigint
}

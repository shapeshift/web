import type { Abi, Hex } from 'viem'
import { decodeFunctionResult, encodeFunctionData } from 'viem'

import type { StargateSendParam } from '../types'

const SendParamTuple = {
  type: 'tuple',
  name: 'sendParam',
  components: [
    { name: 'dstEid', type: 'uint32' },
    { name: 'to', type: 'bytes32' },
    { name: 'amountLD', type: 'uint256' },
    { name: 'minAmountLD', type: 'uint256' },
    { name: 'extraOptions', type: 'bytes' },
    { name: 'composeMsg', type: 'bytes' },
    { name: 'oftCmd', type: 'bytes' },
  ],
} as const

export const IStargateAbi = [
  {
    name: 'quoteOFT',
    type: 'function',
    stateMutability: 'view',
    inputs: [SendParamTuple],
    outputs: [
      {
        type: 'tuple',
        name: 'limit',
        components: [
          { name: 'minAmountLD', type: 'uint256' },
          { name: 'maxAmountLD', type: 'uint256' },
        ],
      },
      {
        type: 'tuple[]',
        name: 'oftFeeDetails',
        components: [
          { name: 'feeAmountLD', type: 'int256' },
          { name: 'description', type: 'string' },
        ],
      },
      {
        type: 'tuple',
        name: 'receipt',
        components: [
          { name: 'amountSentLD', type: 'uint256' },
          { name: 'amountReceivedLD', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'quoteSend',
    type: 'function',
    stateMutability: 'view',
    inputs: [SendParamTuple, { name: '_payInLzToken', type: 'bool' }],
    outputs: [
      {
        type: 'tuple',
        name: 'fee',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'send',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      SendParamTuple,
      {
        type: 'tuple',
        name: '_fee',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
      { name: '_refundAddress', type: 'address' },
    ],
    outputs: [
      {
        type: 'tuple',
        name: 'msgReceipt',
        components: [
          { name: 'guid', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' },
          {
            type: 'tuple',
            name: 'fee',
            components: [
              { name: 'nativeFee', type: 'uint256' },
              { name: 'lzTokenFee', type: 'uint256' },
            ],
          },
        ],
      },
      {
        type: 'tuple',
        name: 'oftReceipt',
        components: [
          { name: 'amountSentLD', type: 'uint256' },
          { name: 'amountReceivedLD', type: 'uint256' },
        ],
      },
    ],
  },
] as const satisfies Abi

type SendParamArgs = {
  dstEid: number
  to: Hex
  amountLD: bigint
  minAmountLD: bigint
  extraOptions: Hex
  composeMsg: Hex
  oftCmd: Hex
}

const toSendParamArgs = (param: StargateSendParam): SendParamArgs => ({
  dstEid: param.dstEid,
  to: param.to,
  amountLD: param.amountLD,
  minAmountLD: param.minAmountLD,
  extraOptions: param.extraOptions,
  composeMsg: param.composeMsg,
  oftCmd: param.oftCmd,
})

export const encodeQuoteOFT = (sendParam: StargateSendParam): Hex =>
  encodeFunctionData({
    abi: IStargateAbi,
    functionName: 'quoteOFT',
    args: [toSendParamArgs(sendParam)],
  })

export const decodeQuoteOFTResult = (data: Hex) =>
  decodeFunctionResult({
    abi: IStargateAbi,
    functionName: 'quoteOFT',
    data,
  })

export const encodeQuoteSend = (sendParam: StargateSendParam, payInLzToken: boolean): Hex =>
  encodeFunctionData({
    abi: IStargateAbi,
    functionName: 'quoteSend',
    args: [toSendParamArgs(sendParam), payInLzToken],
  })

export const decodeQuoteSendResult = (data: Hex) =>
  decodeFunctionResult({
    abi: IStargateAbi,
    functionName: 'quoteSend',
    data,
  })

export const encodeSend = (
  sendParam: StargateSendParam,
  fee: { nativeFee: bigint; lzTokenFee: bigint },
  refundAddress: Hex,
): Hex =>
  encodeFunctionData({
    abi: IStargateAbi,
    functionName: 'send',
    args: [toSendParamArgs(sendParam), fee, refundAddress],
  })

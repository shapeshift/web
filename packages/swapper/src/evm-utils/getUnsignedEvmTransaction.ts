import type { SignTx } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { Hex } from 'viem'
import { concat, numberToHex, size } from 'viem'

import type { GetUnsignedEvmTransactionArgs } from '../types'
import { getEvmExecutionContext } from './getEvmExecutionContext'

export const getUnsignedEvmTransaction = async (
  args: GetUnsignedEvmTransactionArgs,
): Promise<SignTx<EvmChainId>> => {
  const { from, permit2Signature } = args

  const { step, adapter, transactionData, feeData } = await getEvmExecutionContext(args)

  const { accountNumber } = step
  const { to, value } = transactionData

  const data = (() => {
    if (!permit2Signature) return transactionData.data

    // Append the permit2 signature to the calldata
    // https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api#5-append-signature-length-and-signature-data-to-transactiondata
    const signatureLengthInHex = numberToHex(size(permit2Signature as Hex), {
      signed: false,
      size: 32,
    })

    return concat([transactionData.data as Hex, signatureLengthInHex, permit2Signature] as Hex[])
  })()

  return adapter.buildCustomApiTx({ accountNumber, data, from, to, value, ...feeData })
}

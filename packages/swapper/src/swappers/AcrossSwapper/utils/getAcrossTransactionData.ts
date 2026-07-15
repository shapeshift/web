import { fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

import type { SwapErrorRight, SwapperDeps, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { AcrossSwapTx } from './types'

export const getAcrossTransactionData = async (
  swapTx: AcrossSwapTx,
  sellAsset: Asset,
  assertGetSolanaChainAdapter: SwapperDeps['assertGetSolanaChainAdapter'],
): Promise<Result<TxBuildData | undefined, SwapErrorRight>> => {
  if (swapTx.ecosystem === 'evm') {
    return Ok({
      type: 'evm' as const,
      chainId: Number(fromChainId(sellAsset.chainId).chainReference),
      to: swapTx.to,
      data: swapTx.data,
      value: swapTx.value ?? '0',
      gasLimit: swapTx.gas,
    })
  }

  if (swapTx.ecosystem === 'svm') {
    try {
      const txBytes = Buffer.from(swapTx.data, 'base64')
      const versionedTransaction = VersionedTransaction.deserialize(new Uint8Array(txBytes))

      const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

      const addressLookupTableAddresses = versionedTransaction.message.addressTableLookups.map(
        lookup => lookup.accountKey.toString(),
      )

      const addressLookupTableAccountsInfos = await adapter.getAddressLookupTableAccounts(
        addressLookupTableAddresses,
      )

      const addressLookupTableAccounts = addressLookupTableAccountsInfos.map(
        info =>
          new AddressLookupTableAccount({
            key: new PublicKey(info.key),
            state: AddressLookupTableAccount.deserialize(new Uint8Array(info.data)),
          }),
      )

      const computeBudgetProgramId = ComputeBudgetProgram.programId.toString()

      const instructions = TransactionMessage.decompile(versionedTransaction.message, {
        addressLookupTableAccounts,
      }).instructions.filter(
        instruction => instruction.programId.toString() !== computeBudgetProgramId,
      )

      return Ok({ type: 'solana' as const, instructions, addressLookupTableAddresses })
    } catch (e) {
      return Err(
        makeSwapErrorRight({
          message: `[getAcrossTransactionData] Failed to decompile Solana transaction: ${e}`,
          code: TradeQuoteError.UnknownError,
        }),
      )
    }
  }

  return Ok(undefined)
}

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

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { SwapErrorRight, SwapperDeps, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { AcrossSwapTx } from './types'

export const getAcrossStepData = async ({
  swapTx,
  sellAsset,
  from,
  supportsEIP1559,
  fallbackNetworkFeeCryptoBaseUnit,
  assertGetEvmChainAdapter,
  assertGetSolanaChainAdapter,
}: {
  swapTx: AcrossSwapTx
  sellAsset: Asset
  from: string
  supportsEIP1559: boolean
  fallbackNetworkFeeCryptoBaseUnit: string
  assertGetEvmChainAdapter: SwapperDeps['assertGetEvmChainAdapter']
  assertGetSolanaChainAdapter: SwapperDeps['assertGetSolanaChainAdapter']
}): Promise<
  Result<{ transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }, SwapErrorRight>
> => {
  if (swapTx.ecosystem === 'evm') {
    const transactionData = {
      type: 'evm' as const,
      chainId: Number(fromChainId(sellAsset.chainId).chainReference),
      to: swapTx.to,
      data: swapTx.data,
      value: swapTx.value ?? '0',
      gasLimit: swapTx.gas,
    }

    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        return await getEvmNetworkFeeCryptoBaseUnit({
          adapter: assertGetEvmChainAdapter(sellAsset.chainId),
          transactionData,
          from,
          supportsEIP1559,
        })
      } catch {
        return fallbackNetworkFeeCryptoBaseUnit
      }
    })()

    return Ok({ transactionData, networkFeeCryptoBaseUnit })
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

      const { fast } = await adapter.getFeeData({
        to: '',
        value: '0',
        chainSpecific: {
          from,
          addressLookupTableAccounts: addressLookupTableAddresses,
          instructions,
        },
      })

      return Ok({
        transactionData: { type: 'solana' as const, instructions, addressLookupTableAddresses },
        networkFeeCryptoBaseUnit: fast.txFee,
      })
    } catch (e) {
      return Err(
        makeSwapErrorRight({
          message: `[getAcrossStepData] Failed to build Solana step: ${e}`,
          code: TradeQuoteError.UnknownError,
        }),
      )
    }
  }

  return Err(
    makeSwapErrorRight({
      message: `[getAcrossStepData] unsupported ecosystem: ${swapTx.ecosystem}`,
      code: TradeQuoteError.UnsupportedChain,
    }),
  )
}

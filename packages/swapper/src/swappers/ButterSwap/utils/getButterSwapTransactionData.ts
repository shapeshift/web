import { fromChainId, solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import { fromHex } from 'viem'

import type { SwapErrorRight, SwapperDeps, TradeQuoteStep } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { BuildTxSuccessItem, RouteSuccessItem } from '../types'

export const getButterSwapTransactionData = async (
  buildTx: BuildTxSuccessItem,
  route: RouteSuccessItem,
  sellAsset: Asset,
  assertGetSolanaChainAdapter: SwapperDeps['assertGetSolanaChainAdapter'],
): Promise<
  Result<Pick<TradeQuoteStep, 'transactionData' | 'butterSwapTransactionMetadata'>, SwapErrorRight>
> => {
  if (sellAsset.chainId === solanaChainId) {
    try {
      const txData = buildTx.data.startsWith('0x') ? buildTx.data.slice(2) : buildTx.data
      const txBytes = Buffer.from(txData, 'hex')
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

      const instructions = TransactionMessage.decompile(versionedTransaction.message, {
        addressLookupTableAccounts,
      }).instructions

      return Ok({
        transactionData: { type: 'solana' as const, instructions, addressLookupTableAddresses },
      })
    } catch (error) {
      return Err(
        makeSwapErrorRight({
          message: `[getButterSwapTransactionData] Error decompiling VersionedMessage: ${error}`,
          code: TradeQuoteError.UnknownError,
        }),
      )
    }
  }

  if (isEvmChainId(sellAsset.chainId)) {
    return Ok({
      transactionData: {
        type: 'evm' as const,
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to: buildTx.to,
        data: buildTx.data,
        value: fromHex(buildTx.value, 'bigint').toString(),
        gasLimit: bnOrZero(route.gasEstimatedTarget).toFixed(),
      },
    })
  }

  return Ok({
    butterSwapTransactionMetadata: {
      to: buildTx.to,
      data: buildTx.data,
      value: buildTx.value,
      method: buildTx.method,
      args: buildTx.args,
      memo: buildTx.memo,
    },
  })
}

import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import { fromHex } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { SwapErrorRight, SwapperDeps, TradeQuoteStep } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { BuildTxSuccessItem, RouteSuccessItem } from '../types'

export const getButterSwapNetworkFeeCryptoBaseUnit = async ({
  route,
  sellAsset,
  feeAsset,
  assertGetEvmChainAdapter,
  supportsEIP1559,
}: {
  route: RouteSuccessItem
  sellAsset: Asset
  feeAsset: Asset
  assertGetEvmChainAdapter: SwapperDeps['assertGetEvmChainAdapter']
  supportsEIP1559: boolean
}): Promise<string> => {
  if (fromChainId(sellAsset.chainId).chainNamespace === CHAIN_NAMESPACE.Evm) {
    return await getEvmNetworkFeeCryptoBaseUnit({
      adapter: assertGetEvmChainAdapter(sellAsset.chainId),
      supportsEIP1559,
      gasLimit: bnOrZero(route.gasEstimatedTarget).toFixed(),
    })
  }

  if (bnOrZero(route.gasFee?.amount).lte(0)) return '0'

  return BigAmount.fromPrecision({
    value: route.gasFee.amount,
    precision: feeAsset.precision,
  }).toBaseUnit()
}

export const getButterSwapStepData = async (
  buildTx: BuildTxSuccessItem,
  route: RouteSuccessItem,
  sellAsset: Asset,
  feeAsset: Asset,
  deps: SwapperDeps,
  supportsEIP1559: boolean,
): Promise<
  Result<
    Pick<TradeQuoteStep, 'transactionData' | 'butterSwapTransactionMetadata'> & {
      networkFeeCryptoBaseUnit: string
    },
    SwapErrorRight
  >
> => {
  const networkFeeCryptoBaseUnit = await getButterSwapNetworkFeeCryptoBaseUnit({
    route,
    sellAsset,
    feeAsset,
    assertGetEvmChainAdapter: deps.assertGetEvmChainAdapter,
    supportsEIP1559,
  })

  if (fromChainId(sellAsset.chainId).chainNamespace === CHAIN_NAMESPACE.Evm) {
    return Ok({
      transactionData: {
        type: 'evm' as const,
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to: buildTx.to,
        data: buildTx.data,
        value: fromHex(buildTx.value, 'bigint').toString(),
        gasLimit: bnOrZero(route.gasEstimatedTarget).toFixed(),
      },
      networkFeeCryptoBaseUnit,
    })
  }

  if (fromChainId(sellAsset.chainId).chainNamespace === CHAIN_NAMESPACE.Solana) {
    try {
      const txData = buildTx.data.startsWith('0x') ? buildTx.data.slice(2) : buildTx.data
      const txBytes = Buffer.from(txData, 'hex')
      const versionedTransaction = VersionedTransaction.deserialize(new Uint8Array(txBytes))

      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

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
        networkFeeCryptoBaseUnit,
      })
    } catch (error) {
      return Err(
        makeSwapErrorRight({
          message: `[getButterSwapStepData] Error decompiling VersionedMessage: ${error}`,
          code: TradeQuoteError.UnknownError,
        }),
      )
    }
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
    networkFeeCryptoBaseUnit,
  })
}

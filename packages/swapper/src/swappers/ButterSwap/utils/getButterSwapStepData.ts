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

export const getButterSwapStepData = async ({
  buildTx,
  route,
  sellAsset,
  feeAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  deps,
  supportsEIP1559,
  from,
}: {
  buildTx: BuildTxSuccessItem
  route: RouteSuccessItem
  sellAsset: Asset
  feeAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  deps: SwapperDeps
  supportsEIP1559: boolean
  from: string
}): Promise<
  Result<
    Pick<TradeQuoteStep, 'transactionData' | 'butterSwapTransactionMetadata'> & {
      networkFeeCryptoBaseUnit: string
    },
    SwapErrorRight
  >
> => {
  const { chainNamespace, chainReference } = fromChainId(sellAsset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const providerGasLimit = bnOrZero(route.gasEstimatedTarget)

      const transactionData = {
        type: 'evm' as const,
        chainId: Number(chainReference),
        to: buildTx.to,
        data: buildTx.data,
        value: fromHex(buildTx.value, 'bigint').toString(),
        // Leave unset when the provider omits gas so the fee helper estimates and sets one
        gasLimit: providerGasLimit.gt(0) ? providerGasLimit.toFixed() : undefined,
      }

      try {
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
          supportsEIP1559,
          transactionData,
          from,
        })

        return Ok({ transactionData, networkFeeCryptoBaseUnit })
      } catch (error) {
        return Err(
          makeSwapErrorRight({
            message: `[getButterSwapStepData] Error estimating network fee: ${error}`,
            code: TradeQuoteError.NetworkFeeEstimationFailed,
          }),
        )
      }
    }

    case CHAIN_NAMESPACE.Solana: {
      try {
        const networkFeeCryptoBaseUnit = await getButterSwapNetworkFeeCryptoBaseUnit({
          route,
          sellAsset,
          feeAsset,
          assertGetEvmChainAdapter: deps.assertGetEvmChainAdapter,
          supportsEIP1559,
        })

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

    case CHAIN_NAMESPACE.Utxo: {
      if (!buildTx.to) {
        return Err(
          makeSwapErrorRight({
            message: '[getButterSwapStepData] Missing deposit address',
            code: TradeQuoteError.InvalidResponse,
          }),
        )
      }

      if (!buildTx.memo) {
        return Err(
          makeSwapErrorRight({
            message: '[getButterSwapStepData] Missing memo (opReturnData)',
            code: TradeQuoteError.InvalidResponse,
          }),
        )
      }

      const networkFeeCryptoBaseUnit = await getButterSwapNetworkFeeCryptoBaseUnit({
        route,
        sellAsset,
        feeAsset,
        assertGetEvmChainAdapter: deps.assertGetEvmChainAdapter,
        supportsEIP1559,
      })

      return Ok({
        transactionData: {
          type: 'utxo' as const,
          to: buildTx.to,
          opReturnData: buildTx.memo,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        },
        networkFeeCryptoBaseUnit,
      })
    }

    // Not yet migrated to a TxBuildData variant - exec still builds from legacy metadata
    case CHAIN_NAMESPACE.Tron: {
      const networkFeeCryptoBaseUnit = await getButterSwapNetworkFeeCryptoBaseUnit({
        route,
        sellAsset,
        feeAsset,
        assertGetEvmChainAdapter: deps.assertGetEvmChainAdapter,
        supportsEIP1559,
      })

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

    default:
      return Err(
        makeSwapErrorRight({
          message: `[getButterSwapStepData] unsupported chain namespace: ${chainNamespace}`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
  }
}

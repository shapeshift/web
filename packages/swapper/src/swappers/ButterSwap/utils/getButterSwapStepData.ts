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
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  GetUtxoTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuoteStep,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utxo-utils'
import type { BuildTxSuccessItem, RouteSuccessItem } from '../types'

export const getButterSwapNetworkFeeCryptoBaseUnit = async ({
  input,
  route,
  sellAsset,
  feeAsset,
  deps,
}: {
  input: GetTradeRateInput | CommonTradeQuoteInput
  route: RouteSuccessItem
  sellAsset: Asset
  feeAsset: Asset
  deps: SwapperDeps
}): Promise<string> => {
  const { chainNamespace } = fromChainId(sellAsset.chainId)

  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    try {
      return await getEvmNetworkFeeCryptoBaseUnit({
        adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
        supportsEIP1559: Boolean('supportsEIP1559' in input ? input.supportsEIP1559 : false),
        gasLimit: bnOrZero(route.gasEstimatedTarget).toFixed(),
      })
    } catch {
      // Estimation is best effort for rates - fall through to the provider reported fee
    }
  }

  if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    try {
      const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
        adapter: deps.assertGetUtxoChainAdapter(sellAsset.chainId),
        pubkey: (input as GetUtxoTradeQuoteInput | GetUtxoTradeRateInput).xpub,
        to: input.sendAddress ?? UTXO_PLACEHOLDER_ADDRESS,
        value: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      })

      return networkFeeCryptoBaseUnit
    } catch {
      // Estimation is best effort for rates - fall through to the provider reported fee
    }
  }

  if (bnOrZero(route.gasFee?.amount).lte(0)) return '0'

  return BigAmount.fromPrecision({
    value: route.gasFee.amount,
    precision: feeAsset.precision,
  }).toBaseUnit()
}

export const getButterSwapStepData = async ({
  input,
  buildTx,
  route,
  sellAsset,
  feeAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  deps,
  from,
}: {
  input: CommonTradeQuoteInput
  buildTx: BuildTxSuccessItem
  route: RouteSuccessItem
  sellAsset: Asset
  feeAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  deps: SwapperDeps
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
          supportsEIP1559: Boolean('supportsEIP1559' in input ? input.supportsEIP1559 : false),
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
          input,
          route,
          sellAsset,
          feeAsset,
          deps,
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

      const transactionData = {
        type: 'utxo' as const,
        to: buildTx.to,
        opReturnData: buildTx.memo,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      }

      try {
        const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
          adapter: deps.assertGetUtxoChainAdapter(sellAsset.chainId),
          pubkey: (input as GetUtxoTradeQuoteInput).xpub,
          to: transactionData.to,
          value: transactionData.value,
          opReturnData: transactionData.opReturnData,
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

    // Not yet migrated to a TxBuildData variant - exec still builds from legacy metadata
    case CHAIN_NAMESPACE.Tron: {
      const networkFeeCryptoBaseUnit = await getButterSwapNetworkFeeCryptoBaseUnit({
        input,
        route,
        sellAsset,
        feeAsset,
        deps,
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

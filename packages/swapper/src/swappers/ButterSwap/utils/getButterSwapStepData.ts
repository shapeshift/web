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
import {
  getSolanaNetworkFeeCryptoBaseUnit,
  omitComputeBudgetInstructions,
} from '../../../solana-utils'
import type {
  GetTradeQuoteInput,
  GetTradeRateInput,
  StepDataArgs,
  SwapErrorRight,
  SwapperDeps,
  TradeQuoteStep,
  TxBuildData,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import {
  makeNetworkFeeEstimationFailedErr,
  makeSwapErrorRight,
  makeTradeStepBuildFailedErr,
} from '../../../utils'
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utxo-utils'
import type { BuildTxSuccessItem, RouteSuccessItem } from '../types'

// Best effort fee pricing for rates (and the un-migrated tron quote path): estimate where the
// route allows it, falling back to the provider reported fee
const getRateNetworkFeeCryptoBaseUnit = async ({
  input,
  route,
  sellAsset,
  feeAsset,
  sellAmountCryptoBaseUnit,
  deps,
}: {
  input: GetTradeRateInput | GetTradeQuoteInput
  route: RouteSuccessItem
  sellAsset: Asset
  feeAsset: Asset
  sellAmountCryptoBaseUnit: string
  deps: SwapperDeps
}): Promise<string> => {
  const { chainNamespace } = fromChainId(sellAsset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      try {
        return await getEvmNetworkFeeCryptoBaseUnit({
          adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
          supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
          gasLimit: bnOrZero(route.gasEstimatedTarget).toFixed(),
        })
      } catch {
        break
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      try {
        const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
          adapter: deps.assertGetUtxoChainAdapter(sellAsset.chainId),
          pubkey: 'xpub' in input ? input.xpub : undefined,
          to: input.sendAddress ?? UTXO_PLACEHOLDER_ADDRESS,
          value: sellAmountCryptoBaseUnit,
        })

        return networkFeeCryptoBaseUnit
      } catch {
        break
      }
    }
    case CHAIN_NAMESPACE.Solana:
      // Swap instructions don't exist for rates - fall through to the provider reported fee
      break
    default:
      break
  }

  if (bnOrZero(route.gasFee?.amount).lte(0)) return '0'

  return BigAmount.fromPrecision({
    value: route.gasFee.amount,
    precision: feeAsset.precision,
  }).toBaseUnit()
}

type BaseArgs = {
  route: RouteSuccessItem
  feeAsset: Asset
  sellAmountCryptoBaseUnit: string
}

// Swap transactions are only built for quotes - rates price from the route alone
type GetButterSwapStepDataArgs = StepDataArgs<
  BaseArgs,
  { buildTx?: undefined },
  { buildTx: BuildTxSuccessItem }
>

export const getButterSwapStepData = async (
  args: GetButterSwapStepDataArgs,
): Promise<
  Result<
    Pick<TradeQuoteStep, 'transactionData' | 'butterSwapTransactionMetadata'> & {
      networkFeeCryptoBaseUnit: string
    },
    SwapErrorRight
  >
> => {
  const { input, route, sellAsset, feeAsset, sellAmountCryptoBaseUnit, deps } = args

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = await getRateNetworkFeeCryptoBaseUnit({
      input,
      route,
      sellAsset,
      feeAsset,
      sellAmountCryptoBaseUnit,
      deps,
    })

    return Ok({ networkFeeCryptoBaseUnit })
  }

  const { buildTx, from } = args
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
          supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
          transactionData,
          from,
        })

        return Ok({ transactionData, networkFeeCryptoBaseUnit })
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getButterSwapStepData', error))
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
        value: sellAmountCryptoBaseUnit,
      }

      try {
        const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
          adapter: deps.assertGetUtxoChainAdapter(sellAsset.chainId),
          pubkey: 'xpub' in input ? input.xpub : undefined,
          to: transactionData.to,
          value: transactionData.value,
          opReturnData: transactionData.opReturnData,
        })

        return Ok({ transactionData, networkFeeCryptoBaseUnit })
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getButterSwapStepData', error))
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

      try {
        const txData = buildTx.data.startsWith('0x') ? buildTx.data.slice(2) : buildTx.data
        const txBytes = Buffer.from(txData, 'hex')
        const versionedTransaction = VersionedTransaction.deserialize(new Uint8Array(txBytes))

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

        const instructions = omitComputeBudgetInstructions(
          TransactionMessage.decompile(versionedTransaction.message, { addressLookupTableAccounts })
            .instructions,
        )

        const transactionData: TxBuildData = {
          type: 'solana',
          instructions,
          addressLookupTableAddresses,
        }

        try {
          const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
            adapter,
            from,
            instructions,
            addressLookupTableAddresses,
          })

          return Ok({ transactionData, networkFeeCryptoBaseUnit })
        } catch (error) {
          return Err(makeNetworkFeeEstimationFailedErr('getButterSwapStepData', error))
        }
      } catch (error) {
        return Err(makeTradeStepBuildFailedErr('getButterSwapStepData', error))
      }
    }

    // Not yet migrated to a TxBuildData variant - exec still builds from legacy metadata
    case CHAIN_NAMESPACE.Tron: {
      const networkFeeCryptoBaseUnit = await getRateNetworkFeeCryptoBaseUnit({
        input,
        route,
        sellAsset,
        feeAsset,
        sellAmountCryptoBaseUnit,
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

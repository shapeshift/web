import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
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

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import {
  makeNetworkFeeEstimationFailedErr,
  makeSwapErrorRight,
  makeTradeStepBuildFailedErr,
} from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import {
  getSolanaNetworkFeeCryptoBaseUnit,
  omitComputeBudgetInstructions,
} from '../../../utils/solana'
import { getUtxoNetworkFeeCryptoBaseUnit, UTXO_PLACEHOLDER_ADDRESS } from '../../../utils/utxo'
import type { BuildTxSuccessItem, ButterSwapTransactionMetadata, RouteSuccessItem } from '../types'
import { getProviderNetworkFeeCryptoBaseUnit } from './helpers'

type BaseArgs = {
  route: RouteSuccessItem
  feeAsset: Asset
  sellAmountCryptoBaseUnit: string
}

// Swap transactions are only built for quotes - rates price from the route alone
export type GetButterSwapStepDataArgs = StepDataArgs<
  BaseArgs,
  { buildTx?: undefined },
  { buildTx: BuildTxSuccessItem }
>

type ButterSwapRateStepData = {
  networkFeeCryptoBaseUnit: string
}

// transactionData for migrated namespaces; butterSwapTransactionMetadata for the un-migrated tron path
type ButterSwapQuoteStepData = {
  transactionData?: TxBuildData
  butterSwapTransactionMetadata?: ButterSwapTransactionMetadata
  networkFeeCryptoBaseUnit: string
}

export function getButterSwapStepData(
  args: Extract<GetButterSwapStepDataArgs, { type: 'rate' }>,
): Promise<Result<ButterSwapRateStepData, SwapErrorRight>>
export function getButterSwapStepData(
  args: Extract<GetButterSwapStepDataArgs, { type: 'quote' }>,
): Promise<Result<ButterSwapQuoteStepData, SwapErrorRight>>
export async function getButterSwapStepData(
  args: GetButterSwapStepDataArgs,
): Promise<Result<ButterSwapRateStepData | ButterSwapQuoteStepData, SwapErrorRight>> {
  const { input, route, sellAsset, feeAsset, sellAmountCryptoBaseUnit, deps } = args
  const { chainNamespace, chainReference } = fromChainId(sellAsset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

      if (args.type === 'rate') {
        const networkFeeCryptoBaseUnit = await (async () => {
          try {
            return await getEvmNetworkFeeCryptoBaseUnit({
              adapter,
              supportsEIP1559,
              gasLimit: bnOrZero(route.gasEstimatedTarget).toFixed(),
            })
          } catch {
            return getProviderNetworkFeeCryptoBaseUnit({ route, feeAsset })
          }
        })()

        const stepData: ButterSwapRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const { buildTx, from } = args
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
          adapter,
          supportsEIP1559,
          transactionData,
          from,
        })

        const stepData: ButterSwapQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getButterSwapStepData', error))
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
      const pubkey = 'xpub' in input ? input.xpub : undefined

      if (args.type === 'rate') {
        const networkFeeCryptoBaseUnit = await (async () => {
          try {
            const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
              adapter,
              pubkey,
              to: input.sendAddress ?? UTXO_PLACEHOLDER_ADDRESS,
              value: sellAmountCryptoBaseUnit,
            })

            return networkFeeCryptoBaseUnit
          } catch {
            return getProviderNetworkFeeCryptoBaseUnit({ route, feeAsset })
          }
        })()

        const stepData: ButterSwapRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const { buildTx } = args

      // opReturnData routes the bridge for BTC deposits
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
          adapter,
          pubkey,
          to: transactionData.to,
          value: transactionData.value,
          opReturnData: transactionData.opReturnData,
        })

        const stepData: ButterSwapQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getButterSwapStepData', error))
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

      if (args.type === 'rate') {
        // Swap instructions don't exist for rates - best effort with provider fee fallback
        const networkFeeCryptoBaseUnit = getProviderNetworkFeeCryptoBaseUnit({ route, feeAsset })

        const stepData: ButterSwapRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const { buildTx, from } = args

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

          const stepData: ButterSwapQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

          return Ok(stepData)
        } catch (error) {
          return Err(makeNetworkFeeEstimationFailedErr('getButterSwapStepData', error))
        }
      } catch (error) {
        return Err(makeTradeStepBuildFailedErr('getButterSwapStepData', error))
      }
    }
    // Not yet migrated to a TxBuildData variant - exec still builds from legacy metadata
    case CHAIN_NAMESPACE.Tron: {
      const networkFeeCryptoBaseUnit = getProviderNetworkFeeCryptoBaseUnit({ route, feeAsset })

      if (args.type === 'rate') {
        const stepData: ButterSwapRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      const { buildTx } = args

      const stepData: ButterSwapQuoteStepData = {
        butterSwapTransactionMetadata: {
          to: buildTx.to,
          data: buildTx.data,
          value: buildTx.value,
          method: buildTx.method,
          args: buildTx.args,
          memo: buildTx.memo,
        },
        networkFeeCryptoBaseUnit,
      }

      return Ok(stepData)
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

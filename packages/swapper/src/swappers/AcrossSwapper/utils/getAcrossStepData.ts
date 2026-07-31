import { fromChainId } from '@shapeshiftoss/caip'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import {
  makeNetworkFeeEstimationFailedErr,
  makeSwapErrorRight,
  makeTradeStepBuildFailedErr,
} from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import { getSolanaNetworkFeeCryptoBaseUnit } from '../../../utils/solana'
import type { AcrossSwapTx } from './types'

type BaseArgs = {
  swapTx: AcrossSwapTx
  spenderAddress: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string
}

export type GetAcrossStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type AcrossRateStepData = { networkFeeCryptoBaseUnit: string }
type AcrossQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getAcrossStepData(
  args: Extract<GetAcrossStepDataArgs, { type: 'rate' }>,
): Promise<Result<AcrossRateStepData, SwapErrorRight>>
export function getAcrossStepData(
  args: Extract<GetAcrossStepDataArgs, { type: 'quote' }>,
): Promise<Result<AcrossQuoteStepData, SwapErrorRight>>
export async function getAcrossStepData(
  args: GetAcrossStepDataArgs,
): Promise<Result<AcrossRateStepData | AcrossQuoteStepData, SwapErrorRight>> {
  const { swapTx, sellAsset, spenderAddress, from, type, input, fallbackNetworkFeeCryptoBaseUnit, deps } =
    args

  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  switch (swapTx.ecosystem) {
    case 'evm': {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)

      const transactionData = {
        type: 'evm' as const,
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to: swapTx.to,
        data: swapTx.data,
        value: swapTx.value ?? '0',
        gasLimit: swapTx.gas,
      }

      const stateOverride = {
        sellAsset,
        sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        spenderAddress,
      }

      if (type === 'rate') {
        const networkFeeCryptoBaseUnit = await (async () => {
          try {
            return await getEvmNetworkFeeCryptoBaseUnit({
              adapter,
              transactionData,
              from,
              supportsEIP1559,
              stateOverride,
            })
          } catch {
            return fallbackNetworkFeeCryptoBaseUnit
          }
        })()

        const stepData: AcrossRateStepData = { networkFeeCryptoBaseUnit }

        return Ok(stepData)
      }

      try {
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
          stateOverride,
        })

        const stepData: AcrossQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

        return Ok(stepData)
      } catch (error) {
        return Err(makeNetworkFeeEstimationFailedErr('getAcrossStepData', error))
      }
    }
    case 'svm': {
      try {
        const txBytes = Buffer.from(swapTx.data, 'base64')
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

        if (type === 'rate') {
          // No placeholder estimation for provider built routes - best effort with provider fee fallback
          const networkFeeCryptoBaseUnit = await (async () => {
            try {
              const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
                adapter,
                from,
                instructions,
                addressLookupTableAddresses,
                tokenId: contractAddressOrUndefined(sellAsset.assetId),
              })
              return networkFeeCryptoBaseUnit
            } catch {
              return fallbackNetworkFeeCryptoBaseUnit
            }
          })()

          const stepData: AcrossRateStepData = { networkFeeCryptoBaseUnit }

          return Ok(stepData)
        }

        try {
          const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
            adapter,
            from,
            instructions,
            addressLookupTableAddresses,
            tokenId: contractAddressOrUndefined(sellAsset.assetId),
          })

          // Across pre-signs the CCTP message event account slot and pins the blockhash, so the
          // tx is sealed - it must be co-signed and broadcast as-is, never decompiled and rebuilt
          // (the instructions above are estimation-only)
          const transactionData: TxBuildData = {
            type: 'solana_serialized_tx',
            serializedTx: swapTx.data,
          }

          const stepData: AcrossQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

          return Ok(stepData)
        } catch (e) {
          return Err(makeNetworkFeeEstimationFailedErr('getAcrossStepData', e))
        }
      } catch (e) {
        // Rates degrade to the provider fee, quotes can't be built from an undecodable payload
        if (type === 'rate') {
          const stepData: AcrossRateStepData = {
            networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit,
          }

          return Ok(stepData)
        }

        return Err(makeTradeStepBuildFailedErr('getAcrossStepData', e))
      }
    }
    default: {
      return Err(
        makeSwapErrorRight({
          message: `[getAcrossStepData] unsupported ecosystem: ${swapTx.ecosystem}`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
    }
  }
}

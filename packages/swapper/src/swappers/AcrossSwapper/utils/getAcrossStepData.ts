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

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import {
  getSolanaNetworkFeeCryptoBaseUnit,
  omitComputeBudgetInstructions,
} from '../../../solana-utils'
import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import {
  makeNetworkFeeEstimationFailedErr,
  makeSwapErrorRight,
  makeTradeStepBuildFailedErr,
} from '../../../utils'
import type { AcrossSwapTx } from './types'

type BaseArgs = {
  swapTx: AcrossSwapTx
  fallbackNetworkFeeCryptoBaseUnit: string
}

export type GetAcrossStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

export const getAcrossStepData = async ({
  swapTx,
  sellAsset,
  from,
  type,
  input,
  fallbackNetworkFeeCryptoBaseUnit,
  deps,
}: GetAcrossStepDataArgs): Promise<
  Result<{ transactionData?: TxBuildData; networkFeeCryptoBaseUnit: string }, SwapErrorRight>
> => {
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

      if (type === 'rate') {
        try {
          const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
            adapter,
            transactionData,
            from,
            supportsEIP1559,
          })
          return Ok({ networkFeeCryptoBaseUnit })
        } catch {
          return Ok({ networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit })
        }
      }

      try {
        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
        })
        return Ok({ transactionData, networkFeeCryptoBaseUnit })
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

        const instructions = omitComputeBudgetInstructions(
          TransactionMessage.decompile(versionedTransaction.message, { addressLookupTableAccounts })
            .instructions,
        )

        if (type === 'rate') {
          // No placeholder estimation for provider built routes - best effort with provider fee fallback
          try {
            const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
              adapter,
              from,
              instructions,
              addressLookupTableAddresses,
              tokenId: contractAddressOrUndefined(sellAsset.assetId),
            })
            return Ok({ networkFeeCryptoBaseUnit })
          } catch {
            return Ok({ networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit })
          }
        }

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
            tokenId: contractAddressOrUndefined(sellAsset.assetId),
          })
          return Ok({ transactionData, networkFeeCryptoBaseUnit })
        } catch (e) {
          return Err(makeNetworkFeeEstimationFailedErr('getAcrossStepData', e))
        }
      } catch (e) {
        // Rates degrade to the provider fee, quotes can't be built from an undecodable payload
        if (type === 'rate') {
          return Ok({ networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit })
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

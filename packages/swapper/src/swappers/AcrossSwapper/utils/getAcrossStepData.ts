import { fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
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
import type { SwapErrorRight, SwapperDeps, TxBuildData } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { AcrossSwapTx } from './types'

type BaseArgs = {
  swapTx: AcrossSwapTx
  sellAsset: Asset
  from: string
  supportsEIP1559: boolean
  fallbackNetworkFeeCryptoBaseUnit: string
  assertGetEvmChainAdapter: SwapperDeps['assertGetEvmChainAdapter']
  assertGetSolanaChainAdapter: SwapperDeps['assertGetSolanaChainAdapter']
}

type RateArgs = BaseArgs & { type: 'rate' }
type QuoteArgs = BaseArgs & { type: 'quote' }

type GetAcrossStepDataArgs = RateArgs | QuoteArgs

export const getAcrossStepData = async ({
  swapTx,
  sellAsset,
  from,
  type,
  supportsEIP1559,
  fallbackNetworkFeeCryptoBaseUnit,
  assertGetEvmChainAdapter,
  assertGetSolanaChainAdapter,
}: GetAcrossStepDataArgs): Promise<
  Result<{ transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }, SwapErrorRight>
> => {
  switch (swapTx.ecosystem) {
    case 'evm': {
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
    case 'svm': {
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

        const instructions = omitComputeBudgetInstructions(
          TransactionMessage.decompile(versionedTransaction.message, { addressLookupTableAccounts })
            .instructions,
        )

        const transactionData: TxBuildData = {
          type: 'solana',
          instructions,
          addressLookupTableAddresses,
        }

        if (type === 'rate') {
          // Rates are best effort - the unfunded default depositor can't simulate, and the
          // provider fee stands in when estimation isn't possible
          try {
            const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
              adapter,
              from,
              instructions,
              addressLookupTableAddresses,
              tokenId: contractAddressOrUndefined(sellAsset.assetId),
            })
            return Ok({ transactionData, networkFeeCryptoBaseUnit })
          } catch {
            return Ok({
              transactionData,
              networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit,
            })
          }
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
        } catch {
          return Err(
            makeSwapErrorRight({
              message: '[getAcrossStepData] Error estimating network fee',
              code: TradeQuoteError.NetworkFeeEstimationFailed,
            }),
          )
        }
      } catch (e) {
        return Err(
          makeSwapErrorRight({
            message: `[getAcrossStepData] Failed to build Solana step: ${e}`,
            code: TradeQuoteError.UnknownError,
          }),
        )
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

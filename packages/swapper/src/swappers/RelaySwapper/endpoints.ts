import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type { SwapperApi } from '../../types'
import {
  checkSafeTransactionStatus,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { chainIdToRelayChainId } from './constant'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { getLatestRelayStatusMessage } from './utils/getLatestRelayStatusMessage'
import { notifyTransactionIndexing } from './utils/notifyTransactionIndexing'
import { relayService } from './utils/relayService'
import type { RelayStatus } from './utils/types'

// Keep track of the trades we already notified the relay indexer about
const txIndexingMap: Map<string, boolean> = new Map()

export const relayApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input, deps, chainIdToRelayChainId),
  getTradeRate: (input, deps) => getTradeRate(input, deps, chainIdToRelayChainId),
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { relayTransactionMetadata, sellAsset } = step
    if (!relayTransactionMetadata) throw Error('Missing relay transaction metadata')

    const { to, value, data } = relayTransactionMetadata

    if (to === undefined || value === undefined || data === undefined) {
      const undefinedRequiredValues = [to, value, data].filter(value => value === undefined)

      throw Error('undefined required values in transactionRequest', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, relayTransactionMetadata, sellAsset } = step
    if (!relayTransactionMetadata) throw Error('Transaction metadata is required')

    const { to, value, data, gasLimit: gasLimitFromApi } = relayTransactionMetadata

    if (to === undefined || value === undefined || data === undefined) {
      const undefinedRequiredValues = [to, value, data].filter(value => value === undefined)

      throw Error('undefined required values in swap step', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    const unsignedTx = await adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding for total gas used.
      gasLimit: BigNumber.max(gasLimitFromApi ?? '0', feeData.gasLimit).toFixed(),
    })

    return unsignedTx
  },
  getUnsignedUtxoTransaction: async ({
    stepIndex,
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, relayTransactionMetadata } = step
    if (!relayTransactionMetadata) throw new Error('Missing relay transaction metadata')

    const { to, opReturnData } = relayTransactionMetadata

    if (!to) throw new Error('Missing transaction destination')
    if (!opReturnData) throw new Error('Missing opReturnData')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({
      to,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: { pubkey: xpub, opReturnData },
      sendMax: false,
    })

    return assertGetUtxoChainAdapter(sellAsset.chainId).buildSendApiTransaction({
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub,
      to,
      accountNumber,
      chainSpecific: {
        accountType,
        opReturnData,
        satoshiPerByte: fast.chainSpecific.satoshiPerByte,
      },
    })
  },
  getUtxoTransactionFees: async ({ stepIndex, tradeQuote, xpub, assertGetUtxoChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, relayTransactionMetadata } = step
    if (!relayTransactionMetadata?.psbt) throw new Error('Missing psbt')

    const { to, opReturnData } = relayTransactionMetadata

    if (!to) throw new Error('Missing transaction destination')
    if (!opReturnData) throw new Error('Missing opReturnData')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({
      to,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: { pubkey: xpub, opReturnData },
      sendMax: false,
    })

    return fast.txFee
  },
  getSolanaTransactionFees,
  getUnsignedSolanaTransaction,
  getTronTransactionFees,
  getUnsignedTronTransaction,
  checkTradeStatus: async ({
    swap,
    txHash,
    chainId,
    address,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      address,
      fetchIsSmartContractAddressQuery,
    })

    if (!swap?.metadata.relayTransactionMetadata) throw new Error('Missing swap metadata')

    if (maybeSafeTransactionStatus) {
      // return any safe transaction status that has not yet executed on chain (no buyTxHash)
      if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus

      // The safe buyTxHash is the on chain transaction hash (not the safe transaction hash).
      // Mutate txHash and continue with regular status check flow.
      txHash = maybeSafeTransactionStatus.buyTxHash
    }

    if (
      swap.metadata.relayTransactionMetadata &&
      !txIndexingMap.has(swap.id) &&
      isEvmChainId(chainId)
    ) {
      const relayTxParam = {
        ...swap.metadata.relayTransactionMetadata,
        txHash,
      }
      // We don't need to handle the response here, we just want to notify the relay indexer
      await notifyTransactionIndexing(
        {
          requestId: swap.metadata.relayTransactionMetadata.relayId,
          chainId: chainIdToRelayChainId[chainId].toString(),
          tx: JSON.stringify(relayTxParam),
        },
        config,
      )

      txIndexingMap.set(swap.id, true)
    }

    const maybeStatusResponse = await relayService.get<RelayStatus>(
      `${config.VITE_RELAY_API_URL}/intents/status/v2?requestId=${swap.metadata.relayTransactionMetadata.relayId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (statusResponse.status) {
        case 'success':
          return TxStatus.Confirmed
        case 'pending':
          return TxStatus.Pending
        case 'failed':
        case 'refund':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    // Relay refers to in Txs as "inTxHashes" but to out Txs as simply "txHashes" when they really mean "outTxHashes"
    // One thing to note is that for same-chain Txs, there is no "out Tx" per se since the in Tx *is* the out Tx
    const outTxHashes = statusResponse.txHashes
    const isSameChainSwap = statusResponse.destinationChainId === statusResponse.originChainId
    const buyTxHash = isSameChainSwap ? txHash : outTxHashes?.[0]

    return {
      status,
      buyTxHash,
      message: getLatestRelayStatusMessage(statusResponse),
    }
  },
}

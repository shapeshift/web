import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import type { SolanaComputeBudgetOptions } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type { SwapperApi } from '../../types'
import {
  checkSafeTransactionStatus,
  getExecutableTradeStep,
  getSwapMetadata,
  isExecutableTradeQuote,
} from '../../utils'
import { chainIdToRelayChainId } from './constant'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { getLatestRelayStatusMessage } from './utils/getLatestRelayStatusMessage'
import { notifyTransactionIndexing } from './utils/notifyTransactionIndexing'
import { relayService } from './utils/relayService'
import type { RelayStatus, RelayTradeQuoteInput, RelayTradeRateInput } from './utils/types'

// Keep track of the trades we already notified the relay indexer about
const txIndexingMap: Map<string, boolean> = new Map()

const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.6 }

export const relayApi: SwapperApi = {
  getTradeQuote: (input, deps) =>
    getTradeQuote(input as RelayTradeQuoteInput, deps, chainIdToRelayChainId),
  getTradeRate: (input, deps) =>
    getTradeRate(input as RelayTradeRateInput, deps, chainIdToRelayChainId),
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { transactionData, sellAsset } = step
    if (transactionData?.type !== 'evm') throw new Error('[Relay] invalid evm transaction')

    const { to, value, data } = transactionData

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

    const { accountNumber, transactionData, sellAsset } = step
    if (transactionData?.type !== 'evm') throw new Error('[Relay] invalid evm transaction')

    const { to, value, data, gasLimit: gasLimitFromApi } = transactionData

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

    const { accountNumber, sellAsset, transactionData } = step
    if (transactionData?.type !== 'utxo') throw new Error('[Relay] invalid utxo transaction')

    const { to, opReturnData } = transactionData

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

    const { sellAsset, transactionData } = step
    if (transactionData?.type !== 'utxo') throw new Error('[Relay] invalid utxo transaction')

    const { to, opReturnData } = transactionData

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({
      to,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: { pubkey: xpub, opReturnData },
      sendMax: false,
    })

    return fast.txFee
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, solanaComputeBudget)
  },
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

    if (!swap) throw new Error('Missing swap')

    const relayMetadata = getSwapMetadata(swap.metadata.swapperMetadata, 'relay')

    if (maybeSafeTransactionStatus) {
      // return any safe transaction status that has not yet executed on chain (no buyTxHash)
      if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus

      // The safe buyTxHash is the on chain transaction hash (not the safe transaction hash).
      // Mutate txHash and continue with regular status check flow.
      txHash = maybeSafeTransactionStatus.buyTxHash
    }

    if (
      relayMetadata &&
      !txIndexingMap.has(swap.id) &&
      chainIdToRelayChainId[chainId] !== undefined
    ) {
      // relay's /transactions/single indexer `tx` param is the EVM calldata (see spec)
      await notifyTransactionIndexing(
        {
          requestId: relayMetadata.relayId,
          chainId: chainIdToRelayChainId[chainId].toString(),
          tx: relayMetadata.data ?? '',
        },
        config,
      )

      txIndexingMap.set(swap.id, true)
    }

    const maybeStatusResponse = await relayService.get<RelayStatus>(
      `${config.VITE_RELAY_API_URL}/intents/status/v2?requestId=${relayMetadata.relayId}`,
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

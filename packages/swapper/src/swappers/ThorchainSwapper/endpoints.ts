import { cosmosAssetId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { thorchain } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import axios from 'axios'

import { getInboundAddressDataForChain } from '../../thorchain-utils'
import type { CosmosSdkFeeData, SwapperApi, UtxoFeeData } from '../../types'
import {
  checkSafeTransactionStatus,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { getEvmData } from './evm/utils/getEvmData'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getThorTradeRate } from './getThorTradeRate/getTradeRate'
import type {
  ThorEvmTradeQuote,
  ThornodeStatusResponse,
  ThornodeTxResponse,
  ThorTradeQuote,
} from './types'
import { getLatestThorTxStatusMessage } from './utils/getLatestThorTxStatusMessage'
import { parseThorBuyTxHash } from './utils/parseThorBuyTxHash'
import { getThorTxInfo as getUtxoThorTxInfo } from './utxo/utils/getThorTxData'

export const thorchainApi: SwapperApi = {
  getTradeQuote: (input, deps) => {
    const { affiliateBps } = input

    return getThorTradeQuote({ ...input, affiliateBps }, deps)
  },
  getTradeRate: (input, deps) => {
    const { affiliateBps } = input

    return getThorTradeRate({ ...input, affiliateBps }, deps)
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
    config,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

    const value = isNativeEvmAsset(sellAsset.assetId)
      ? sellAmountIncludingProtocolFeesCryptoBaseUnit
      : '0'

    const { data, to } = await getEvmData({
      config,
      step,
      tradeQuote: tradeQuote as ThorEvmTradeQuote,
    })

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return adapter.buildCustomApiTx({ accountNumber, data, from, to, value, ...feeData })
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
    config,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

    const { data, to } = await getEvmData({
      config,
      step,
      tradeQuote: tradeQuote as ThorEvmTradeQuote,
    })

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const value = isNativeEvmAsset(sellAsset.assetId)
      ? sellAmountIncludingProtocolFeesCryptoBaseUnit
      : '0'

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },
  getUnsignedUtxoTransaction: async ({
    tradeQuote,
    stepIndex,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
    config,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { memo } = tradeQuote as ThorTradeQuote
    if (!memo) throw new Error('Memo is required')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } =
      step

    const { vault, opReturnData } = await getUtxoThorTxInfo({
      sellAsset,
      xpub,
      memo,
      config,
    })

    return assertGetUtxoChainAdapter(sellAsset.chainId).buildSendApiTransaction({
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub,
      to: vault,
      accountNumber,
      // skip address validation for thorchain vault addresses as they may exceed the risk score threshold, but are still valid for use
      skipToAddressValidation: true,
      chainSpecific: {
        accountType,
        opReturnData,
        satoshiPerByte: (feeData.chainSpecific as UtxoFeeData).satsPerByte,
      },
    })
  },
  getUtxoTransactionFees: async ({
    stepIndex,
    tradeQuote,
    xpub,
    assertGetUtxoChainAdapter,
    config,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { memo } = tradeQuote as ThorTradeQuote
    if (!memo) throw new Error('Memo is required')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const { vault, opReturnData } = await getUtxoThorTxInfo({
      sellAsset,
      xpub,
      memo,
      config,
    })

    const { fast } = await adapter.getFeeData({
      to: vault,
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: { pubkey: xpub, opReturnData },
      sendMax: false,
    })

    return fast.txFee
  },
  getUnsignedCosmosSdkTransaction: async ({
    tradeQuote,
    stepIndex,
    from,
    config,
    assertGetCosmosSdkChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { memo } = tradeQuote as ThorTradeQuote
    if (!memo) throw new Error('Memo is required')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } =
      step

    const gas = (feeData.chainSpecific as CosmosSdkFeeData).estimatedGasCryptoBaseUnit
    const fee = feeData.networkFeeCryptoBaseUnit ?? '0'

    switch (sellAsset.assetId) {
      case thorchainAssetId:
      case tcyAssetId: {
        const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId) as thorchain.ChainAdapter

        const { txToSign } = await adapter.buildDepositTransaction({
          accountNumber,
          from,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo,
          chainSpecific: { gas, fee, coin: tcyAssetId ? 'THOR.TCY' : 'THOR.RUNE' },
        })

        return txToSign
      }
      case cosmosAssetId: {
        const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

        const daemonUrl = config.VITE_THORCHAIN_NODE_URL

        const maybeGaiaAddressData = await getInboundAddressDataForChain(daemonUrl, cosmosAssetId)
        if (maybeGaiaAddressData.isErr()) throw maybeGaiaAddressData.unwrapErr()

        const { address: vault } = maybeGaiaAddressData.unwrap()

        const { txToSign } = await adapter.buildSendApiTransaction({
          accountNumber,
          from,
          to: vault,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo,
          chainSpecific: { gas, fee },
        })

        return txToSign
      }

      default:
        throw Error(`Unsupported sellAsset.assetId '${sellAsset.assetId}'`)
    }
  },
  getCosmosSdkTransactionFees: async ({
    stepIndex,
    tradeQuote,
    assertGetCosmosSdkChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset } = step

    const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

    const { fast } = await adapter.getFeeData({})

    return fast.txFee
  },
  checkTradeStatus: async ({
    txHash,
    chainId,
    accountId,
    fetchIsSmartContractAddressQuery,
    config,
    assertGetEvmChainAdapter,
  }) => {
    try {
      const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
        txHash,
        chainId,
        assertGetEvmChainAdapter,
        accountId,
        fetchIsSmartContractAddressQuery,
      })

      if (maybeSafeTransactionStatus) {
        // return any safe transaction status that has not yet executed on chain (no buyTxHash)
        if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus

        // The safe buyTxHash is the on chain transaction hash (not the safe transaction hash).
        // Mutate txHash and continue with regular status check flow.
        txHash = maybeSafeTransactionStatus.buyTxHash
      }

      const thorTxHash = txHash.replace(/^0x/, '')

      // not using monadic axios, this is intentional for simplicity in this non-monadic context
      const [{ data: txData }, { data: txStatusData }] = await Promise.all([
        axios.get<ThornodeTxResponse>(
          `${config.VITE_THORCHAIN_NODE_URL}/thorchain/tx/${thorTxHash}`,
        ),
        axios.get<ThornodeStatusResponse>(
          `${config.VITE_THORCHAIN_NODE_URL}/thorchain/tx/status/${thorTxHash}`,
        ),
      ])

      // We care about txStatusData errors because it drives all of the status logic.
      if ('error' in txStatusData) {
        return {
          buyTxHash: undefined,
          status: TxStatus.Unknown,
          message: undefined,
        }
      }

      // We use planned_out_txs to determine the number of out txs because we don't want to derive
      // swap completion based on the length of out_txs which is populated as the trade executed
      const numOutTxs = txStatusData.planned_out_txs?.length ?? 0
      const lastOutTx = txStatusData.out_txs?.[numOutTxs - 1]

      const buyTxHash = parseThorBuyTxHash(txHash, lastOutTx)

      const hasOutboundL1Tx = lastOutTx !== undefined && lastOutTx.chain !== 'THOR'
      const hasOutboundRuneTx = lastOutTx !== undefined && lastOutTx.chain === 'THOR'

      if (txStatusData.planned_out_txs?.some(plannedOutTx => plannedOutTx.refund)) {
        return {
          buyTxHash,
          status: TxStatus.Failed,
          message: undefined,
        }
      }

      // We consider the transaction confirmed as soon as we have a buyTxHash
      // For UTXOs, this means that the swap will be confirmed as soon as Txs hit the mempool
      // Which is actually correct, as we update UTXO balances optimistically
      if (!('error' in txData) && buyTxHash && (hasOutboundL1Tx || hasOutboundRuneTx)) {
        return {
          buyTxHash,
          status: TxStatus.Confirmed,
          message: undefined,
        }
      }

      const message = getLatestThorTxStatusMessage(txStatusData, hasOutboundL1Tx)
      return {
        buyTxHash,
        status: TxStatus.Pending,
        message,
      }
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }
  },
}

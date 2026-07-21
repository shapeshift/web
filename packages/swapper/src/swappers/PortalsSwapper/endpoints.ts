import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import type {
  CheckTradeStatusInput,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  SwapperApi,
  TradeStatus,
} from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'
import { getPortalsTradeRate } from './getPortalsTradeRate/getPortalsTradeRate'
import {
  fetchAxelarscanBridgeStatus,
  getAxelarscanTrackingLink,
} from './utils/fetchAxelarscanStatus'
import { fetchSquidBridgeStatus, getSquidTrackingLink } from './utils/fetchSquidStatus'

export const portalsApi: SwapperApi = {
  getTradeQuote: async (input, { config, assertGetEvmChainAdapter }) => {
    const tradeQuoteResult = await getPortalsTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      config,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, { config, assertGetEvmChainAdapter }) => {
    const tradeRateResult = await getPortalsTradeRate(
      input as GetEvmTradeRateInput,
      assertGetEvmChainAdapter,
      config,
    )

    return tradeRateResult.map(tradeRate => [tradeRate])
  },
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  checkTradeStatus: async (input: CheckTradeStatusInput): Promise<TradeStatus> => {
    const {
      txHash,
      chainId,
      swap,
      assertGetEvmChainAdapter,
      address,
      fetchIsSmartContractAddressQuery,
    } = input

    const isCrossChain = Boolean(swap && swap.sellAsset.chainId !== swap.buyAsset?.chainId)

    if (!isCrossChain) {
      return checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })
    }

    const sourceTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      address,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
    })

    if (sourceTxStatus.status === TxStatus.Pending || sourceTxStatus.status === TxStatus.Unknown) {
      return {
        status: TxStatus.Pending,
        buyTxHash: undefined,
        message: 'Source transaction pending',
      }
    }

    if (sourceTxStatus.status === TxStatus.Failed) {
      return sourceTxStatus
    }

    const axelarscanResult = await fetchAxelarscanBridgeStatus(txHash)

    if ((axelarscanResult.isErr() || !axelarscanResult.unwrap()) && swap) {
      const squidResult = await fetchSquidBridgeStatus(
        txHash,
        swap.sellAsset.chainId,
        swap.buyAsset.chainId,
      )

      if (squidResult.isOk()) {
        const squidStatus = squidResult.unwrap()
        const squidTxStatus = (() => {
          switch (squidStatus.status) {
            case 'confirmed':
              return TxStatus.Confirmed
            case 'failed':
              return TxStatus.Failed
            case 'pending':
            default:
              return TxStatus.Pending
          }
        })()

        return {
          status: squidTxStatus,
          buyTxHash: squidStatus.destinationTxHash,
          relayerExplorerTxLink: getSquidTrackingLink(
            txHash,
            squidStatus,
            swap.sellAsset.explorerTxLink,
            swap.buyAsset.explorerTxLink,
          ),
          message: squidTxStatus === TxStatus.Pending ? 'Cross-chain swap in progress' : undefined,
        }
      }

      return {
        status: TxStatus.Pending,
        buyTxHash: undefined,
        relayerExplorerTxLink: getAxelarscanTrackingLink(txHash),
        message: 'Bridge status check failed - track manually',
      }
    }

    const bridgeStatus = axelarscanResult.unwrap()
    if (!bridgeStatus) {
      return {
        status: TxStatus.Pending,
        buyTxHash: undefined,
        message: 'Cross-chain swap in progress',
      }
    }

    const txStatus = (() => {
      switch (bridgeStatus.status) {
        case 'confirmed':
          return TxStatus.Confirmed
        case 'failed':
          return TxStatus.Failed
        case 'pending':
        default:
          return TxStatus.Pending
      }
    })()

    return {
      status: txStatus,
      buyTxHash: bridgeStatus.destinationTxHash,
      relayerExplorerTxLink: getAxelarscanTrackingLink(txHash),
      message:
        txStatus === TxStatus.Pending
          ? 'Bridge in progress'
          : txStatus === TxStatus.Failed
          ? bridgeStatus.errorMessage
          : undefined,
    }
  },
}

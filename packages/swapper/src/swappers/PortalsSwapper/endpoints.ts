import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, SwapperApi, TradeStatus } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'
import { getPortalsTradeRate } from './getPortalsTradeRate/getPortalsTradeRate'
import type { PortalsTradeQuoteInput, PortalsTradeRateInput } from './types'
import {
  fetchAxelarscanBridgeStatus,
  getAxelarscanTrackingLink,
} from './utils/fetchAxelarscanStatus'
import { fetchRelayBridgeStatus, getRelayTrackingLink } from './utils/fetchRelayStatus'
import { fetchSquidBridgeStatus, getSquidTrackingLink } from './utils/fetchSquidStatus'

const toTxStatus = (status: 'pending' | 'confirmed' | 'failed'): TxStatus => {
  switch (status) {
    case 'confirmed':
      return TxStatus.Confirmed
    case 'failed':
      return TxStatus.Failed
    case 'pending':
    default:
      return TxStatus.Pending
  }
}

export const portalsApi: SwapperApi = {
  getTradeQuote: (input, deps) => getPortalsTradeQuote(input as PortalsTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getPortalsTradeRate(input as PortalsTradeRateInput, deps),
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

    // Portals bridge most cross-chain orders through Relay, and the rest through Axelar or Squid,
    // without telling us which - ask each indexer in turn until one recognises the origin tx
    const relayResult = await fetchRelayBridgeStatus(txHash)

    if (relayResult.isOk()) {
      const relayStatus = relayResult.unwrap()

      if (relayStatus) {
        const txStatus = toTxStatus(relayStatus.status)

        return {
          status: txStatus,
          buyTxHash: relayStatus.destinationTxHash,
          swapperTxLink: getRelayTrackingLink(txHash),
          message:
            txStatus === TxStatus.Pending
              ? 'Bridge in progress'
              : txStatus === TxStatus.Failed
              ? relayStatus.errorMessage
              : undefined,
        }
      }
    }

    const axelarscanResult = await fetchAxelarscanBridgeStatus(txHash)

    if (axelarscanResult.isOk()) {
      const bridgeStatus = axelarscanResult.unwrap()

      if (bridgeStatus) {
        const txStatus = toTxStatus(bridgeStatus.status)

        return {
          status: txStatus,
          buyTxHash: bridgeStatus.destinationTxHash,
          swapperTxLink: getAxelarscanTrackingLink(txHash),
          message:
            txStatus === TxStatus.Pending
              ? 'Bridge in progress'
              : txStatus === TxStatus.Failed
              ? bridgeStatus.errorMessage
              : undefined,
        }
      }
    }

    if (swap) {
      const squidResult = await fetchSquidBridgeStatus(
        txHash,
        swap.sellAsset.chainId,
        swap.buyAsset.chainId,
      )

      if (squidResult.isOk()) {
        const squidStatus = squidResult.unwrap()
        const squidTxStatus = toTxStatus(squidStatus.status)

        return {
          status: squidTxStatus,
          buyTxHash: squidStatus.destinationTxHash,
          swapperTxLink: getSquidTrackingLink(
            txHash,
            squidStatus,
            swap.sellAsset.explorerTxLink,
            swap.buyAsset.explorerTxLink,
          ),
          message: squidTxStatus === TxStatus.Pending ? 'Cross-chain swap in progress' : undefined,
        }
      }
    }

    // No indexer recognises the tx yet - the bridge may not have picked it up, so keep polling
    return {
      status: TxStatus.Pending,
      buyTxHash: undefined,
      message: 'Cross-chain swap in progress',
    }
  },
}

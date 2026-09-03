import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, SwapperApi, TradeStatus } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import {
  fetchRelayRequestByTxHash,
  getRelayRequestFailureMessage,
  getRelayTrackingLink,
  relayStatusToTxStatus,
} from '../RelaySwapper/utils/relayStatus'
import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'
import { getPortalsTradeRate } from './getPortalsTradeRate/getPortalsTradeRate'
import type { PortalsTradeQuoteInput, PortalsTradeRateInput } from './types'
import {
  fetchAxelarscanBridgeStatus,
  getAxelarscanTrackingLink,
} from './utils/fetchAxelarscanStatus'
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
      config,
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

    const relayResult = await fetchRelayRequestByTxHash(txHash, config)

    if (relayResult.isOk()) {
      const relayRequest = relayResult.unwrap()

      if (relayRequest) {
        const relayTxStatus = relayStatusToTxStatus(relayRequest.status)
        const txStatus = relayTxStatus === TxStatus.Unknown ? TxStatus.Pending : relayTxStatus

        return {
          status: txStatus,
          buyTxHash: relayRequest.data?.outTxs?.[0]?.hash,
          swapperTxLink: getRelayTrackingLink(txHash),
          message:
            txStatus === TxStatus.Failed
              ? getRelayRequestFailureMessage(relayRequest)
              : txStatus === TxStatus.Confirmed
              ? undefined
              : 'Bridge in progress',
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

    // No indexer knows the tx yet - the bridge may not have picked it up, so keep polling
    return {
      status: TxStatus.Pending,
      buyTxHash: undefined,
      message: 'Cross-chain swap in progress',
    }
  },
}

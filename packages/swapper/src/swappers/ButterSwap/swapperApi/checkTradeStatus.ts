import { solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, TradeStatus } from '../../../types'
import {
  checkEvmSwapStatus,
  checkSolanaSwapStatus,
  createDefaultStatusResponse,
} from '../../../utils'
import { getBridgeInfoBySourceHash } from '../xhr'

// See: https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
// Example endpoint: https://bs-app-api.chainservice.io/api/queryBridgeInfoBySourceHash?hash=0x...

// State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
const BUTTER_SWAP_STATES = (() => ({
  Pending: 0,
  Confirmed: 1,
  Failed: 6,
}))()

export const checkTradeStatus = async (input: CheckTradeStatusInput): Promise<TradeStatus> => {
  const {
    txHash,
    chainId: sellChainId,
    address,
    swap,
    assertGetEvmChainAdapter,
    assertGetSolanaChainAdapter,
    fetchIsSmartContractAddressQuery,
  } = input
  try {
    // Same-chain swaps don't go through the bridge indexer. Short-circuit to on-chain status.
    const isSameChainSwap = Boolean(swap && swap.sellAsset.chainId === swap.buyAsset?.chainId)
    if (isSameChainSwap) {
      if (sellChainId === solanaChainId) {
        return await checkSolanaSwapStatus({
          txHash,
          address,
          assertGetSolanaChainAdapter,
        })
      }

      if (isEvmChainId(sellChainId)) {
        return await checkEvmSwapStatus({
          txHash,
          chainId: sellChainId,
          address,
          assertGetEvmChainAdapter,
          fetchIsSmartContractAddressQuery,
        })
      }

      // Fallback: unknown same-chain type (should never happen for Butter, but just in case). Avoid bridge polling.
      return createDefaultStatusResponse(txHash)
    }

    // Fetch bridge info by source hash
    const infoResult = await getBridgeInfoBySourceHash(txHash)

    if (infoResult.isErr()) {
      const error = infoResult.unwrapErr()
      return {
        status: TxStatus.Unknown,
        buyTxHash: undefined,
        message: error.message,
      }
    }

    const bridgeInfo = infoResult.unwrap()

    if (!bridgeInfo) {
      return { status: TxStatus.Unknown, buyTxHash: undefined, message: undefined }
    }

    // Use toHash as the destination chain tx hash if present
    const destinationTxHash = bridgeInfo.toHash ?? undefined
    const relayerTxHash = bridgeInfo.relayerHash ?? undefined
    const relayerExplorerTxLink = bridgeInfo.relayerChain?.scanUrl ?? undefined

    // State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
    let status: TxStatus = (() => {
      // Optimistically return Confirmed if we have a destination tx hash, useful to chains with long block
      // times (e.g. BTC)
      if (!!destinationTxHash) return TxStatus.Confirmed

      switch (bridgeInfo.state) {
        case BUTTER_SWAP_STATES.Pending:
          return TxStatus.Pending
        case BUTTER_SWAP_STATES.Confirmed:
          return TxStatus.Confirmed
        case BUTTER_SWAP_STATES.Failed:
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return {
      status,
      buyTxHash: destinationTxHash,
      relayerTxHash,
      relayerExplorerTxLink,
      message: undefined,
    }
  } catch (e) {
    return { status: TxStatus.Unknown, buyTxHash: undefined, message: (e as Error).message }
  }
}

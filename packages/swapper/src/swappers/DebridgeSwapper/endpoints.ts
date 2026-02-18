import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { debridgeService } from './utils/debridgeService'
import type { DebridgeOrderIdsResponse, DebridgeOrderStatus } from './utils/types'

const DEBRIDGE_STATS_API_URL = 'https://stats-api.dln.trade'

export const debridgeApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input, deps),
  getTradeRate: (input, deps) => getTradeRate(input, deps),
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { debridgeTransactionMetadata, sellAsset } = step
    if (!debridgeTransactionMetadata) throw new Error('Missing deBridge transaction metadata')

    const { to, value, data } = debridgeTransactionMetadata

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

    const { accountNumber, debridgeTransactionMetadata, sellAsset } = step
    if (!debridgeTransactionMetadata) throw new Error('Missing deBridge transaction metadata')

    const { to, value, data, gasLimit: gasLimitFromApi } = debridgeTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    const unsignedTx = await adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      gasLimit: BigNumber.max(gasLimitFromApi ?? '0', feeData.gasLimit).toFixed(),
    })

    return unsignedTx
  },
  checkTradeStatus: async ({
    txHash,
    chainId,
    address,
    swap,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    const isSameChainSwap = swap?.metadata.debridgeTransactionMetadata?.isSameChainSwap === true

    if (isSameChainSwap) {
      return {
        buyTxHash: txHash,
        status: TxStatus.Confirmed,
        message: undefined,
      }
    }

    if (isEvmChainId(chainId)) {
      const sourceTxStatus = await checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })

      if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus

      txHash = sourceTxStatus.buyTxHash ?? txHash
    }

    const maybeOrderIdsResponse = await debridgeService.get<DebridgeOrderIdsResponse>(
      `${DEBRIDGE_STATS_API_URL}/api/Transaction/${txHash}/orderIds`,
    )

    if (maybeOrderIdsResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Pending,
        message: 'Waiting for order confirmation...',
      }
    }

    const { data: orderIdsResponse } = maybeOrderIdsResponse.unwrap()

    if (!orderIdsResponse.orderIds?.length) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Pending,
        message: 'Waiting for order confirmation...',
      }
    }

    const orderId = orderIdsResponse.orderIds[0].stringValue

    const maybeStatusResponse = await debridgeService.get<DebridgeOrderStatus>(
      `https://dln.debridge.finance/v1.0/dln/order/${orderId}/status`,
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
        case 'Fulfilled':
        case 'SentUnlock':
        case 'ClaimedUnlock':
          return TxStatus.Confirmed
        case 'Created':
        case 'None':
          return TxStatus.Pending
        case 'OrderCancelled':
        case 'SentOrderCancel':
        case 'ClaimedOrderCancel':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    const message = (() => {
      switch (statusResponse.status) {
        case 'Created':
        case 'None':
          return 'Order created, waiting for solver fulfillment...'
        case 'Fulfilled':
          return 'Order fulfilled, unlocking funds...'
        case 'SentUnlock':
          return 'Unlock transaction sent...'
        case 'OrderCancelled':
          return 'Order was cancelled'
        case 'SentOrderCancel':
          return 'Cancellation in progress...'
        case 'ClaimedOrderCancel':
          return 'Order cancelled and refunded'
        default:
          return undefined
      }
    })()

    return {
      status,
      buyTxHash: undefined,
      message,
    }
  },
}

import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { debridgeService } from './utils/debridgeService'
import type {
  DebridgeOrderDetail,
  DebridgeOrderIdsResponse,
  DebridgeOrderStatus,
} from './utils/types'

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

    const { to, value, data, gasLimit: gasLimitFromApi } = debridgeTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    try {
      const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })
      return feeData.networkFeeCryptoBaseUnit
    } catch (e) {
      console.error('[deBridge] getEvmTransactionFees: gas estimation failed, using API fallback', {
        error: e,
        chainId: sellAsset.chainId,
        to,
        value,
      })
      if (!gasLimitFromApi) throw new Error('Gas estimation failed and no API gas limit fallback')
      const { average } = await adapter.getGasFeeData()
      return evm.calcNetworkFeeCryptoBaseUnit({
        ...average,
        supportsEIP1559,
        gasLimit: gasLimitFromApi,
      })
    }
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

    const feeData = await (async () => {
      try {
        const fees = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })
        const result = {
          ...fees,
          gasLimit: BigNumber(fees.gasLimit).times('1.2').toFixed(0),
        }
        console.log(
          '[deBridge] getUnsignedEvmTransaction feeData',
          JSON.stringify({
            chainId: sellAsset.chainId,
            to,
            value,
            supportsEIP1559,
            feesFromEstimate: fees,
            gasLimitWithBuffer: result.gasLimit,
          }),
        )
        return result
      } catch (e) {
        console.error(
          '[deBridge] getUnsignedEvmTransaction: gas estimation failed, using API fallback',
          { error: e, chainId: sellAsset.chainId, to, value },
        )
        if (!gasLimitFromApi) throw new Error('Gas estimation failed and no API gas limit fallback')
        const { average } = await adapter.getGasFeeData()
        const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
          ...average,
          supportsEIP1559,
          gasLimit: gasLimitFromApi,
        })
        const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = average
        if (supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
          return {
            networkFeeCryptoBaseUnit,
            gasLimit: gasLimitFromApi,
            maxFeePerGas,
            maxPriorityFeePerGas,
          }
        }
        return { networkFeeCryptoBaseUnit, gasLimit: gasLimitFromApi, gasPrice }
      }
    })()

    const unsignedTx = await adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
    })

    return unsignedTx
  },
  checkTradeStatus: async ({
    txHash,
    chainId,
    address,
    swap,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    const isSameChainSwap = swap?.metadata.debridgeTransactionMetadata?.isSameChainSwap === true

    if (isSameChainSwap) {
      return checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })
    }

    let resolvedTxHash = txHash

    if (isEvmChainId(chainId)) {
      const sourceTxStatus = await checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })

      if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus

      resolvedTxHash = sourceTxStatus.buyTxHash ?? txHash
    }

    const maybeOrderIdsResponse = await debridgeService.get<DebridgeOrderIdsResponse>(
      `${DEBRIDGE_STATS_API_URL}/api/Transaction/${resolvedTxHash}/orderIds`,
    )

    if (maybeOrderIdsResponse.isErr()) {
      console.error('[deBridge] checkTradeStatus: failed to fetch orderIds', {
        error: maybeOrderIdsResponse.unwrapErr(),
        txHash: resolvedTxHash,
        chainId,
      })
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
      `${config.VITE_DEBRIDGE_API_URL}/dln/order/${orderId}/status`,
    )

    if (maybeStatusResponse.isErr()) {
      console.error('[deBridge] checkTradeStatus: failed to fetch order status', {
        error: maybeStatusResponse.unwrapErr(),
        orderId,
        txHash: resolvedTxHash,
        chainId,
      })
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

    const buyTxHash = await (async () => {
      if (status !== TxStatus.Confirmed) return undefined
      const maybeOrderDetail = await debridgeService.get<DebridgeOrderDetail>(
        `${DEBRIDGE_STATS_API_URL}/api/Orders/${orderId}`,
      )
      if (maybeOrderDetail.isErr()) return undefined
      return maybeOrderDetail.unwrap().data.fulfilledDstEventMetadata?.transactionHash?.stringValue
    })()

    return {
      status,
      buyTxHash,
      message,
    }
  },
}

import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import type {
  CheckTradeStatusInput,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  SwapperApi,
  TradeStatus,
} from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
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
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { portalsTransactionMetadata, sellAsset } = step
    if (!portalsTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to, data } = portalsTransactionMetadata

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

    const { accountNumber, portalsTransactionMetadata, sellAsset } = step
    if (!portalsTransactionMetadata) throw new Error('Transaction metadata is required')

    // Portals has a 15% buffer on gas estimations, which may or may not turn out to be more reliable than our "pure" simulations
    const { value, to, data, gasLimit: estimatedGas } = portalsTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding for total gas used.
      gasLimit: BigNumber.max(feeData.gasLimit, estimatedGas).toFixed(),
    })
  },
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
            swap.sellAsset.chainId,
            swap.buyAsset.chainId,
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

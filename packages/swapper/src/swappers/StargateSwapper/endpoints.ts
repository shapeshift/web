import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { stargateService } from './utils/stargateService'

type LayerZeroMessageStatus = 'INFLIGHT' | 'CONFIRMING' | 'DELIVERED' | 'FAILED'

type LayerZeroMessage = {
  status: LayerZeroMessageStatus
  dstTxHash: string | undefined
}

type LayerZeroScanResponse = {
  messages: LayerZeroMessage[]
}

export const stargateApi: SwapperApi = {
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

    const { stargateTransactionMetadata, sellAsset } = step
    if (!stargateTransactionMetadata) throw new Error('Missing Stargate transaction metadata')

    const { to, value, data } = stargateTransactionMetadata

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

    const { accountNumber, stargateTransactionMetadata, sellAsset } = step
    if (!stargateTransactionMetadata) throw new Error('Missing Stargate transaction metadata')

    const { to, value, data, gasLimit: gasLimitFromApi } = stargateTransactionMetadata

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
    assertGetEvmChainAdapter,
    fetchIsSmartContractAddressQuery,
  }) => {
    if (isEvmChainId(chainId)) {
      const sourceTxStatus = await checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })

      if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus
    }

    const maybeStatusResponse = await stargateService.get<LayerZeroScanResponse>(
      `https://scan.layerzero-api.com/v1/messages/tx/${txHash}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Pending,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const firstMessage = statusResponse.messages[0] as LayerZeroMessage | undefined

    const status = (() => {
      switch (firstMessage?.status) {
        case 'INFLIGHT':
        case 'CONFIRMING':
          return TxStatus.Pending
        case 'DELIVERED':
          return TxStatus.Confirmed
        case 'FAILED':
          return TxStatus.Failed
        default:
          return TxStatus.Pending
      }
    })()

    const message = (() => {
      switch (firstMessage?.status) {
        case 'INFLIGHT':
          return 'Cross-chain message in flight...'
        case 'CONFIRMING':
          return 'Confirming on destination chain...'
        case 'FAILED':
          return 'Cross-chain transfer failed'
        default:
          return undefined
      }
    })()

    const buyTxHash = firstMessage?.dstTxHash

    return {
      status,
      buyTxHash,
      message,
    }
  },
}

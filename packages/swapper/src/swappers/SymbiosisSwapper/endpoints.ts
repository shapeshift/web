import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { chainIdToSymbiosisChainId, SYMBIOSIS_EXPLORER_URL } from './utils/constants'
import { getSymbiosisTradeStatus } from './utils/helpers'
import { symbiosisService } from './utils/symbiosisService'
import type {
  SymbiosisTradeQuoteInput,
  SymbiosisTradeRateInput,
  SymbiosisTxResponse,
} from './utils/types'

export const symbiosisApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as SymbiosisTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as SymbiosisTradeRateInput, deps),
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getTronTransactionFees,
  getUnsignedTronTransaction,
  checkTradeStatus: async ({
    txHash,
    chainId,
    address,
    config,
    swap,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    if (!swap) throw new Error('Missing swap')

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

    const sellSymbiosisChainId = chainIdToSymbiosisChainId[chainId]
    const buySymbiosisChainId = chainIdToSymbiosisChainId[swap.buyAsset.chainId]

    const maybeStatusResponse = await symbiosisService.get<SymbiosisTxResponse>(
      `${config.VITE_SYMBIOSIS_API_URL}/v2/tx/${sellSymbiosisChainId}/${txHash}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: response } = maybeStatusResponse.unwrap()

    return {
      ...getSymbiosisTradeStatus({ response, buySymbiosisChainId }),
      swapperTxId: txHash,
      swapperTxLink: `${SYMBIOSIS_EXPLORER_URL}/transactions/${sellSymbiosisChainId}/${txHash}`,
    }
  },
}

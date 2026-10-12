import { tronChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { chainIdToSymbiosisChainId, SYMBIOSIS_EXPLORER_URL } from './utils/constants'
import { getSymbiosisTradeStatus, isTronSourceTxFailed } from './utils/helpers'
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
    assertGetTronChainAdapter,
  }) => {
    if (!swap) throw new Error('Missing swap')

    const evmSourceTxStatus = isEvmChainId(chainId)
      ? await checkEvmSwapStatus({
          txHash,
          chainId,
          address,
          assertGetEvmChainAdapter,
          fetchIsSmartContractAddressQuery,
        })
      : undefined

    if (evmSourceTxStatus && evmSourceTxStatus.status !== TxStatus.Confirmed) {
      return evmSourceTxStatus
    }

    const sourceTxHash = evmSourceTxStatus?.buyTxHash ?? txHash

    if (chainId === tronChainId) {
      const sourceTx = await assertGetTronChainAdapter(chainId)
        .httpProvider.getTransaction({ txid: sourceTxHash })
        .catch(() => null)

      if (!sourceTx?.confirmations) {
        return { buyTxHash: undefined, status: TxStatus.Pending, message: undefined }
      }

      if (isTronSourceTxFailed(sourceTx)) {
        return { buyTxHash: undefined, status: TxStatus.Failed, message: undefined }
      }
    }

    const sellSymbiosisChainId = chainIdToSymbiosisChainId[chainId]
    const buySymbiosisChainId = chainIdToSymbiosisChainId[swap.buyAsset.chainId]

    const maybeStatusResponse = await symbiosisService.get<SymbiosisTxResponse>(
      `${config.VITE_SYMBIOSIS_API_URL}/v2/tx/${sellSymbiosisChainId}/${sourceTxHash}`,
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
      swapperTxId: sourceTxHash,
      swapperTxLink: `${SYMBIOSIS_EXPLORER_URL}/transactions/${sellSymbiosisChainId}/${sourceTxHash}`,
    }
  },
}

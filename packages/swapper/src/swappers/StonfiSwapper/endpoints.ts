import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { Blockchain } from '@ston-fi/omniston-sdk'

import type { SwapperApi, TradeStatus } from '../../types'
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  getSwapMetadata,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import type { StonfiTradeQuoteInput, StonfiTradeRateInput } from './types'
import { STONFI_TRADE_TRACKING_TIMEOUT_MS } from './utils/constants'
import { waitForFirstTradeStatus } from './utils/helpers'
import { omnistonManager } from './utils/omnistonManager'

export const stonfiApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as StonfiTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as StonfiTradeRateInput, deps),

  getUnsignedTonTransaction: async ({ stepIndex, tradeQuote, from, assertGetTonChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, sellAsset, stonfiTransactionData } = step

    if (!stonfiTransactionData) throw new Error('[Stonfi] invalid ton transaction')

    const adapter = assertGetTonChainAdapter(sellAsset.chainId)

    const omniston = omnistonManager.getInstance()

    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const txResponse = await omniston.buildTransfer({
          sourceAddress: { blockchain: Blockchain.TON, address: from },
          destinationAddress: {
            blockchain: Blockchain.TON,
            address: tradeQuote.receiveAddress,
          },
          quote: stonfiTransactionData as Parameters<typeof omniston.buildTransfer>[0]['quote'],
          useRecommendedSlippage: true,
        })

        if (!txResponse?.ton?.messages || txResponse.ton.messages.length === 0) {
          throw new Error('No TON messages returned from buildTransfer')
        }

        const expireAt = Math.floor(Date.now() / 1000) + 300

        const convertBase64ToHex = (base64: string | undefined): string => {
          if (!base64) return ''
          return Buffer.from(base64, 'base64').toString('hex')
        }

        const rawMessages = txResponse.ton.messages.map(msg => ({
          targetAddress: msg.targetAddress,
          sendAmount: msg.sendAmount,
          payload: convertBase64ToHex(msg.payload),
          stateInit: convertBase64ToHex(msg.jettonWalletStateInit),
        }))

        const seqno = await adapter.getSeqno(from)

        return {
          addressNList: toAddressNList(adapter.getBip44Params({ accountNumber })),
          rawMessages,
          seqno,
          expireAt,
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.error(
          `[Stonfi] buildTransfer attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        )

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    throw lastError ?? new Error('Failed to build transfer after retries')
  },

  getTonTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  checkTradeStatus: async ({ swap, assertGetTonChainAdapter }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return createDefaultStatusResponse()
    }

    const { sellTxHash } = swap

    const checkTxStatusViaChainAdapter = async (): Promise<TradeStatus> => {
      try {
        const adapter = assertGetTonChainAdapter(swap.sellAsset.chainId)
        const tx = await adapter.parseTx(sellTxHash, '')

        return {
          status: tx.status,
          buyTxHash: tx.status === TxStatus.Confirmed ? sellTxHash : undefined,
          message: undefined,
        }
      } catch (err) {
        console.error('[Stonfi] Error checking tx status via chain adapter:', err)
        return createDefaultStatusResponse(sellTxHash)
      }
    }

    const { quoteId } = getSwapMetadata(swap.metadata.swapperMetadata, 'stonfi')

    // Settlement precedes toncenter's jetton indexer, and confirmed rows are never re-parsed -
    // hold confirmation until the receive leg is visible so the confirmed-time parse and upsert
    // carries both legs of the swap
    const hasVisibleReceiveLeg = async (): Promise<boolean> => {
      const adapter = assertGetTonChainAdapter(swap.sellAsset.chainId)
      const sellAddress = swap.sellAccountId.split(':')[2] ?? ''
      const addresses = new Set(
        [sellAddress, swap.receiveAddress].filter((address): address is string => Boolean(address)),
      )

      for (const address of addresses) {
        const tx = await adapter.parseTx(sellTxHash, address)
        if (tx.transfers.some(transfer => transfer.type === TransferType.Receive)) return true
      }

      return false
    }

    try {
      const tradeStatus = await waitForFirstTradeStatus(
        {
          quoteId,
          traderWalletAddress: {
            blockchain: Blockchain.TON,
            address: swap.sellAccountId.split(':')[2] ?? '',
          },
          outgoingTxHash: sellTxHash,
        },
        STONFI_TRADE_TRACKING_TIMEOUT_MS,
      )

      if (!tradeStatus?.status) {
        return checkTxStatusViaChainAdapter()
      }

      const statusOneOf = tradeStatus.status

      // While the trade is in flight the wallet tx may already be confirmed, but the payout leg
      // hasn't landed - confirming here would parse and upsert a trace without the receive, so
      // completion waits for settlement
      if (
        statusOneOf.awaitingTransfer ||
        statusOneOf.transferring ||
        statusOneOf.swapping ||
        statusOneOf.receivingFunds
      ) {
        if (statusOneOf.awaitingTransfer) {
          return {
            status: TxStatus.Pending,
            buyTxHash: undefined,
            message: 'trade.statuses.awaitingDeposit',
          }
        }

        if (statusOneOf.transferring) {
          return {
            status: TxStatus.Pending,
            buyTxHash: undefined,
            message: 'trade.statuses.depositing',
          }
        }

        if (statusOneOf.swapping) {
          return {
            status: TxStatus.Pending,
            buyTxHash: undefined,
            message: 'trade.statuses.swapping',
          }
        }

        if (statusOneOf.receivingFunds) {
          return {
            status: TxStatus.Pending,
            buyTxHash: undefined,
            message: 'trade.statuses.receivingFunds',
          }
        }
      }

      if (statusOneOf.tradeSettled) {
        const result = statusOneOf.tradeSettled.result

        if (result === 'TRADE_RESULT_FULLY_FILLED' || result === 'TRADE_RESULT_PARTIALLY_FILLED') {
          const settled: TradeStatus = {
            status: TxStatus.Confirmed,
            buyTxHash: sellTxHash,
            message:
              result === 'TRADE_RESULT_PARTIALLY_FILLED'
                ? 'trade.statuses.partiallyFilled'
                : undefined,
          }

          try {
            if (await hasVisibleReceiveLeg()) return settled

            return {
              status: TxStatus.Pending,
              buyTxHash: undefined,
              message: 'trade.statuses.receivingFunds',
            }
          } catch (error) {
            // Indexer/API failure must not block completion
            console.error('[Stonfi] Error verifying settlement receive leg:', {
              sellTxHash,
              result,
              error,
            })
            return settled
          }
        }

        if (result === 'TRADE_RESULT_ABORTED') {
          return {
            status: TxStatus.Failed,
            buyTxHash: undefined,
            message: 'trade.statuses.aborted',
          }
        }
      }

      return checkTxStatusViaChainAdapter()
    } catch (err) {
      console.error('[Stonfi] Error checking trade status via Omniston:', err)
      return checkTxStatusViaChainAdapter()
    }
  },
}

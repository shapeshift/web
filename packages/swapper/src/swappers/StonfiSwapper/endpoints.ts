import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type {
  Quote,
  QuoteResponseEvent,
  TradeStatus as OmnistonTradeStatus,
} from '@ston-fi/omniston-sdk'
import { Blockchain, Omniston } from '@ston-fi/omniston-sdk'

import type { SwapperApi, TradeStatus } from '../../types'
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { STONFI_WEBSOCKET_URL } from './utils/constants'

const TRADE_TRACKING_TIMEOUT_MS = 60000
const QUOTE_TIMEOUT_MS = 30000

const waitForFirstTradeStatus = (
  omniston: Omniston,
  request: {
    quoteId: string
    traderWalletAddress: { blockchain: number; address: string }
    outgoingTxHash: string
  },
  timeoutMs: number,
): Promise<OmnistonTradeStatus | null> => {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      resolve(null)
    }, timeoutMs)

    const subscription = omniston.trackTrade(request).subscribe({
      next: (status: OmnistonTradeStatus) => {
        clearTimeout(timer)
        subscription.unsubscribe()
        resolve(status)
      },
      error: () => {
        clearTimeout(timer)
        resolve(null)
      },
    })
  })
}

const waitForQuote = (
  omniston: Omniston,
  request: Parameters<typeof omniston.requestForQuote>[0],
  timeoutMs: number,
): Promise<Quote | null> => {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      resolve(null)
    }, timeoutMs)

    const subscription = omniston.requestForQuote(request).subscribe({
      next: (event: QuoteResponseEvent) => {
        if (event.type === 'quoteUpdated' && event.quote) {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve(event.quote)
        } else if (event.type === 'noQuote') {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve(null)
        }
      },
      error: () => {
        clearTimeout(timer)
        resolve(null)
      },
    })
  })
}

export const stonfiApi: SwapperApi = {
  getTradeQuote: (input, _deps) => getTradeQuote(input),
  getTradeRate: input => getTradeRate(input),

  getUnsignedTonTransaction: async ({ stepIndex, tradeQuote, from, assertGetTonChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, sellAsset, stonfiSpecific } = step

    if (!stonfiSpecific) {
      throw new Error('stonfiSpecific is required')
    }

    const adapter = assertGetTonChainAdapter(sellAsset.chainId)

    const omniston = new Omniston({ apiUrl: STONFI_WEBSOCKET_URL })

    try {
      const freshQuote = await waitForQuote(
        omniston,
        {
          settlementMethods: ['SETTLEMENT_METHOD_SWAP' as const],
          bidAssetAddress: { blockchain: Blockchain.TON, address: 'native' },
          askAssetAddress: { blockchain: Blockchain.TON, address: 'native' },
          amount: {
            bidUnits: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          },
        },
        QUOTE_TIMEOUT_MS,
      )

      if (!freshQuote) {
        throw new Error('Failed to get fresh quote for transaction building')
      }

      const txResponse = await omniston.buildTransfer({
        sourceAddress: { blockchain: Blockchain.TON, address: from },
        destinationAddress: {
          blockchain: Blockchain.TON,
          address: tradeQuote.receiveAddress,
        },
        quote: freshQuote,
        useRecommendedSlippage: true,
      })

      if (!txResponse.ton?.messages || txResponse.ton.messages.length === 0) {
        throw new Error('No TON messages returned from buildTransfer')
      }

      const messages = txResponse.ton.messages
      const totalAmount = messages.reduce((acc, msg) => acc + BigInt(msg.sendAmount), 0n)

      const expireAt = Math.floor(Date.now() / 1000) + 300

      const messagePayload = Buffer.from(
        JSON.stringify({
          messages: messages.map(msg => ({
            to: msg.targetAddress,
            value: msg.sendAmount,
            payload: msg.payload,
            stateInit: msg.jettonWalletStateInit,
          })),
          totalAmount: totalAmount.toString(),
        }),
      )

      return {
        addressNList: toAddressNList(adapter.getBip44Params({ accountNumber })),
        message: messagePayload,
        seqno: 0,
        expireAt,
      }
    } finally {
      omniston.close()
    }
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

  checkTradeStatus: async ({ swap }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return createDefaultStatusResponse()
    }

    const { metadata, sellTxHash } = swap

    if (!metadata?.quoteId) {
      return createDefaultStatusResponse(sellTxHash)
    }

    const omniston = new Omniston({ apiUrl: STONFI_WEBSOCKET_URL })

    try {
      const tradeStatus = await waitForFirstTradeStatus(
        omniston,
        {
          quoteId: metadata.quoteId,
          traderWalletAddress: {
            blockchain: Blockchain.TON,
            address: swap.sellAccountId.split(':')[2] ?? '',
          },
          outgoingTxHash: sellTxHash,
        },
        TRADE_TRACKING_TIMEOUT_MS,
      )

      if (!tradeStatus?.status) {
        return createDefaultStatusResponse(sellTxHash)
      }

      const statusOneOf = tradeStatus.status

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

      if (statusOneOf.tradeSettled) {
        const result = statusOneOf.tradeSettled.result

        if (result === 'TRADE_RESULT_FULLY_FILLED') {
          return {
            status: TxStatus.Confirmed,
            buyTxHash: sellTxHash,
            message: undefined,
          }
        }

        if (result === 'TRADE_RESULT_PARTIALLY_FILLED') {
          return {
            status: TxStatus.Confirmed,
            buyTxHash: sellTxHash,
            message: 'trade.statuses.partiallyFilled',
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

      return createDefaultStatusResponse(sellTxHash)
    } catch (err) {
      console.error('[Stonfi] Error checking trade status:', err)
      return createDefaultStatusResponse(sellTxHash)
    } finally {
      omniston.close()
    }
  },
}

import { TxStatus } from '@shapeshiftoss/unchained-client'
import EventEmitter from 'events'
import { TRADE_POLL_INTERVAL_MILLISECONDS } from 'components/MultiHopTrade/hooks/constants'
import { withFromOrXpub } from 'components/MultiHopTrade/hooks/useTradeExecution/helpers'
import { poll } from 'lib/poll/poll'

import { swappers } from './constants'
import type {
  SellTxHashArgs,
  StatusArgs,
  TradeExecutionBase,
  TradeExecutionEventMap,
  TradeExecutionInput,
} from './types'
import { TradeExecutionEvent } from './types'

export class TradeExecution implements TradeExecutionBase {
  private emitter = new EventEmitter()

  on<T extends TradeExecutionEvent>(eventName: T, callback: TradeExecutionEventMap[T]): void {
    this.emitter.on(eventName, callback)
  }

  async exec({
    swapperName,
    tradeQuote,
    stepIndex,
    accountMetadata,
    wallet,
    supportsEIP1559,
    slippageTolerancePercentageDecimal,
  }: TradeExecutionInput) {
    try {
      const maybeSwapper = swappers.find(swapper => swapper.swapperName === swapperName)

      if (!maybeSwapper) {
        throw new Error(`no swapper matching swapperName '${swapperName}'`)
      }

      const { swapper } = maybeSwapper

      if (!swapper.getUnsignedTx) {
        throw Error('missing implementation for getUnsignedTx')
      }
      if (!swapper.executeTrade) {
        throw Error('missing implementation for executeTrade')
      }

      const chainId = tradeQuote.steps[stepIndex].sellAsset.chainId

      const unsignedTxResult = await withFromOrXpub(swapper.getUnsignedTx)(
        {
          wallet,
          chainId,
          accountMetadata,
        },
        {
          tradeQuote,
          chainId,
          accountMetadata,
          stepIndex,
          supportsEIP1559,
          slippageTolerancePercentageDecimal,
        },
      )

      const sellTxHash = await swapper.executeTrade({
        txToSign: unsignedTxResult,
        wallet,
        chainId,
      })

      const sellTxHashArgs: SellTxHashArgs = { stepIndex, sellTxHash }
      this.emitter.emit(TradeExecutionEvent.SellTxHash, sellTxHashArgs)

      const { cancelPolling } = poll({
        fn: async () => {
          const { status, message, buyTxHash } = await swapper.checkTradeStatus({
            quoteId: tradeQuote.id,
            txHash: sellTxHash,
            chainId,
            stepIndex,
          })

          const payload: StatusArgs = { stepIndex, status, message, buyTxHash }
          this.emitter.emit(TradeExecutionEvent.Status, payload)

          if (status === TxStatus.Confirmed) this.emitter.emit(TradeExecutionEvent.Success, payload)
          if (status === TxStatus.Failed) this.emitter.emit(TradeExecutionEvent.Fail, payload)

          return status
        },
        validate: status => {
          return status === TxStatus.Confirmed || status === TxStatus.Failed
        },
        interval: TRADE_POLL_INTERVAL_MILLISECONDS,
        maxAttempts: Infinity,
      })

      return { cancelPolling }
    } catch (e) {
      this.emitter.emit(TradeExecutionEvent.Error, e)
    }
  }
}

import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import EventEmitter from 'events'
import { TRADE_POLL_INTERVAL_MILLISECONDS } from 'components/MultiHopTrade/hooks/constants'
import { poll } from 'lib/poll/poll'
import { assertUnreachable } from 'lib/utils'

import { swappers } from './constants'
import type {
  SellTxHashArgs,
  StatusArgs,
  TradeExecutionBase,
  TradeExecutionEventMap,
  TradeExecutionInput2,
} from './types'
import { TradeExecutionEvent } from './types'

export class TradeExecution2 implements TradeExecutionBase {
  private emitter = new EventEmitter()

  on<T extends TradeExecutionEvent>(eventName: T, callback: TradeExecutionEventMap[T]): void {
    this.emitter.on(eventName, callback)
  }

  async execWalletAgnostic({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    evm,
    utxo,
    cosmosSdk,
  }: TradeExecutionInput2) {
    try {
      const maybeSwapper = swappers.find(swapper => swapper.swapperName === swapperName)

      if (!maybeSwapper) throw new Error(`no swapper matching swapperName '${swapperName}'`)

      const { swapper } = maybeSwapper

      const chainId = tradeQuote.steps[stepIndex].sellAsset.chainId

      const { chainNamespace } = fromChainId(chainId)

      const sellTxHash = await (async () => {
        switch (chainNamespace) {
          case CHAIN_NAMESPACE.Utxo: {
            if (!swapper.getUnsignedTxUtxo) {
              throw Error('missing implementation for getUnsignedTxUtxo')
            }
            if (!swapper.executeTradeUtxo) {
              throw Error('missing implementation for executeTradeUtxo')
            }

            const unsignedTxResult = await swapper.getUnsignedTxUtxo({
              tradeQuote,
              chainId,
              stepIndex,
              slippageTolerancePercentageDecimal,
              ...utxo,
            })

            return await swapper.executeTradeUtxo(unsignedTxResult, utxo)
          }

          case CHAIN_NAMESPACE.Evm: {
            if (!swapper.getUnsignedTxEvm) {
              throw Error('missing implementation for getUnsignedTxEvm')
            }
            if (!swapper.executeTradeEvm) {
              throw Error('missing implementation for executeTradeEvm')
            }

            const unsignedTxResult = await swapper.getUnsignedTxEvm({
              tradeQuote,
              chainId,
              stepIndex,
              slippageTolerancePercentageDecimal,
              ...evm,
            })

            return await swapper.executeTradeEvm(unsignedTxResult, evm)
          }

          case CHAIN_NAMESPACE.CosmosSdk: {
            if (!swapper.getUnsignedTxCosmosSdk) {
              throw Error('missing implementation for getUnsignedTxCosmosSdk')
            }
            if (!swapper.executeTradeCosmosSdk) {
              throw Error('missing implementation for executeTradeCosmosSdk')
            }

            const unsignedTxResult = await swapper.getUnsignedTxCosmosSdk({
              tradeQuote,
              chainId,
              stepIndex,
              slippageTolerancePercentageDecimal,
              ...cosmosSdk,
            })

            return await swapper.executeTradeCosmosSdk(unsignedTxResult, cosmosSdk)
          }

          default:
            assertUnreachable(chainNamespace)
        }
      })()

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

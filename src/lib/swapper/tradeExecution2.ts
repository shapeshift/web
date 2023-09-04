import { TxStatus } from '@shapeshiftoss/unchained-client'
import EventEmitter from 'events'
import { TRADE_POLL_INTERVAL_MILLISECONDS } from 'components/MultiHopTrade/hooks/constants'
import { poll } from 'lib/poll/poll'

import { swappers } from './constants'
import type {
  CommonGetUnsignedTxArgs,
  CommonTradeExecutionInput,
  CosmosSdkTradeExecutionInput,
  CowTradeExecutionInput,
  EvmTradeExecutionInput,
  SellTxHashArgs,
  StatusArgs,
  Swapper,
  SwapperApi,
  TradeExecutionBase,
  TradeExecutionEventMap,
  UtxoTradeExecutionInput,
} from './types'
import { TradeExecutionEvent } from './types'

export class TradeExecution2 implements TradeExecutionBase {
  private emitter = new EventEmitter()

  on<T extends TradeExecutionEvent>(eventName: T, callback: TradeExecutionEventMap[T]): void {
    this.emitter.on(eventName, callback)
  }

  private async _execWalletAgnostic(
    {
      swapperName,
      tradeQuote,
      stepIndex,
      slippageTolerancePercentageDecimal,
    }: CommonTradeExecutionInput,
    buildSignBroadcast: (
      swapper: Swapper & SwapperApi,
      args: CommonGetUnsignedTxArgs,
    ) => Promise<string>,
  ) {
    try {
      const maybeSwapper = swappers.find(swapper => swapper.swapperName === swapperName)

      if (!maybeSwapper) throw new Error(`no swapper matching swapperName '${swapperName}'`)

      const { swapper } = maybeSwapper

      const chainId = tradeQuote.steps[stepIndex].sellAsset.chainId

      const sellTxHash = await buildSignBroadcast(swapper, {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
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
      console.log(e)
      this.emitter.emit(TradeExecutionEvent.Error, e)
    }
  }

  async execEvm({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    nonce,
    signAndBroadcastTransaction,
  }: EvmTradeExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
      }: CommonGetUnsignedTxArgs,
    ) => {
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
        from,
        nonce,
      })

      return await swapper.executeTradeEvm(unsignedTxResult, { signAndBroadcastTransaction })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execCow({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signMessage,
  }: CowTradeExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
      }: CommonGetUnsignedTxArgs,
    ) => {
      if (!swapper.getUnsignedTxCow) {
        throw Error('missing implementation for getUnsignedTxCow')
      }
      if (!swapper.executeTradeCow) {
        throw Error('missing implementation for executeTradeCow')
      }

      const unsignedTxResult = await swapper.getUnsignedTxCow({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
      })

      return await swapper.executeTradeCow(unsignedTxResult, { signMessage })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execUtxo({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    xpub,
    accountType,
    signAndBroadcastTransaction,
  }: UtxoTradeExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
      }: CommonGetUnsignedTxArgs,
    ) => {
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
        xpub,
        accountType,
      })

      return await swapper.executeTradeUtxo(unsignedTxResult, { signAndBroadcastTransaction })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execCosmosSdk({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signAndBroadcastTransaction,
  }: CosmosSdkTradeExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
      }: CommonGetUnsignedTxArgs,
    ) => {
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
        from,
      })

      return await swapper.executeTradeCosmosSdk(unsignedTxResult, {
        signAndBroadcastTransaction,
      })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }
}

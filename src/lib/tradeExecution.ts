import type {
  CommonGetUnsignedTransactionArgs,
  CommonTradeExecutionInput,
  CosmosSdkTransactionExecutionInput,
  EvmMessageExecutionInput,
  EvmTransactionExecutionInput,
  SellTxHashArgs,
  StatusArgs,
  Swapper,
  SwapperApi,
  TradeExecutionEventMap,
  UtxoTransactionExecutionInput,
} from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  swappers,
  TRADE_POLL_INTERVAL_MILLISECONDS,
  TradeExecutionEvent,
} from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import EventEmitter from 'events'
import { poll } from 'lib/poll/poll'

import { getEthersV5Provider } from './ethersProviderSingleton'
import { assertGetCosmosSdkChainAdapter } from './utils/cosmosSdk'
import { assertGetEvmChainAdapter } from './utils/evm'
import { assertGetUtxoChainAdapter } from './utils/utxo'

export class TradeExecution {
  private emitter = new EventEmitter()
  private pollInterval = TRADE_POLL_INTERVAL_MILLISECONDS

  on<T extends TradeExecutionEvent>(eventName: T, callback: TradeExecutionEventMap[T]): void {
    this.emitter.on(eventName, callback)
  }

  setPollInterval(ms: number): void {
    this.pollInterval = ms
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
      args: CommonGetUnsignedTransactionArgs,
    ) => Promise<string>,
  ) {
    try {
      const maybeSwapper = swappers[swapperName]

      if (maybeSwapper === undefined)
        throw new Error(`no swapper matching swapperName '${swapperName}'`)

      const swapper = maybeSwapper

      const hop = getHopByIndex(tradeQuote, stepIndex)

      if (!hop) {
        throw new Error(`No hop found for stepIndex ${stepIndex}`)
      }
      const chainId = hop.sellAsset.chainId

      const sellTxHash = await buildSignBroadcast(swapper, {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config: getConfig(),
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
            config: getConfig(),
            assertGetEvmChainAdapter,
            getEthersV5Provider,
            assertGetUtxoChainAdapter,
            assertGetCosmosSdkChainAdapter,
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
        interval: this.pollInterval,
        maxAttempts: Infinity,
      })

      return { cancelPolling }
    } catch (e) {
      console.error(e)
      this.emitter.emit(TradeExecutionEvent.Error, e)
    }
  }

  async execEvmTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    supportsEIP1559,
    signAndBroadcastTransaction,
  }: EvmTransactionExecutionInput) {
    const buildSignBroadcast =
      (_supportsEIP1559: boolean) =>
      async (
        swapper: Swapper & SwapperApi,
        {
          tradeQuote,
          chainId,
          stepIndex,
          slippageTolerancePercentageDecimal,
          config,
        }: CommonGetUnsignedTransactionArgs,
      ) => {
        if (!swapper.getUnsignedEvmTransaction) {
          throw Error('missing implementation for getUnsignedEvmTransaction')
        }
        if (!swapper.executeEvmTransaction) {
          throw Error('missing implementation for executeEvmTransaction')
        }

        const unsignedTxResult = await swapper.getUnsignedEvmTransaction({
          tradeQuote,
          chainId,
          stepIndex,
          slippageTolerancePercentageDecimal,
          from,
          supportsEIP1559: _supportsEIP1559,
          config,
          assertGetEvmChainAdapter,
          getEthersV5Provider,
        })

        return await swapper.executeEvmTransaction(unsignedTxResult, {
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
      buildSignBroadcast(supportsEIP1559),
    )
  }

  async execEvmMessage({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signMessage,
  }: EvmMessageExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedEvmMessage) {
        throw Error('missing implementation for getUnsignedEvmMessage')
      }
      if (!swapper.executeEvmMessage) {
        throw Error('missing implementation for executeEvmMessage')
      }

      const unsignedTxResult = await swapper.getUnsignedEvmMessage({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
        config,
        assertGetEvmChainAdapter,
        getEthersV5Provider,
      })

      return await swapper.executeEvmMessage(unsignedTxResult, { signMessage }, config)
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

  async execUtxoTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    xpub,
    accountType,
    signAndBroadcastTransaction,
  }: UtxoTransactionExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedUtxoTransaction) {
        throw Error('missing implementation for getUnsignedUtxoTransaction')
      }
      if (!swapper.executeUtxoTransaction) {
        throw Error('missing implementation for executeUtxoTransaction')
      }

      const unsignedTxResult = await swapper.getUnsignedUtxoTransaction({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        xpub,
        accountType,
        config,
        assertGetUtxoChainAdapter,
      })

      return await swapper.executeUtxoTransaction(unsignedTxResult, { signAndBroadcastTransaction })
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

  async execCosmosSdkTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signAndBroadcastTransaction,
  }: CosmosSdkTransactionExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedCosmosSdkTransaction) {
        throw Error('missing implementation for getUnsignedCosmosSdkTransaction')
      }
      if (!swapper.executeCosmosSdkTransaction) {
        throw Error('missing implementation for executeCosmosSdkTransaction')
      }

      const unsignedTxResult = await swapper.getUnsignedCosmosSdkTransaction({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
        config,
        assertGetCosmosSdkChainAdapter,
      })

      return await swapper.executeCosmosSdkTransaction(unsignedTxResult, {
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

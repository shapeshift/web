import { TxStatus } from '@shapeshiftoss/unchained-client'
import EventEmitter from 'events'
import { TRADE_POLL_INTERVAL_MILLISECONDS } from 'components/MultiHopTrade/hooks/constants'
import { withFromOrXpub } from 'components/MultiHopTrade/hooks/useTradeExecution/helpers'
import { poll } from 'lib/poll/poll'

import { swappers } from './constants'
import type { TradeExecutionInput } from './types'

export class TradeExecution extends EventEmitter {
  async exec({
    swapperName,
    tradeQuote,
    stepIndex,
    accountMetadata,
    quoteSellAssetAccountId,
    quoteBuyAssetAccountId,
    wallet,
    supportsEIP1559,
    buyAssetUsdRate,
    feeAssetUsdRate,
    slippageTolerancePercentageDecimal,
    getState,
  }: TradeExecutionInput) {
    try {
      const maybeSwapper = swappers.find(swapper => swapper.swapperName === swapperName)

      if (!maybeSwapper) {
        throw new Error(`no swapper matching swapperName '${swapperName}'`)
      }

      const { swapper } = maybeSwapper

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
          buyAssetUsdRate,
          feeAssetUsdRate,
          slippageTolerancePercentageDecimal,
        },
      )

      const sellTxHash = await swapper.executeTrade({
        txToSign: unsignedTxResult,
        wallet,
        chainId,
      })

      this.emit('sellTxHash', { stepIndex, sellTxHash })

      const { promise, cancelPolling } = poll({
        fn: async () => {
          const { status, message, buyTxHash } = await swapper.checkTradeStatus({
            quoteId: tradeQuote.id,
            txHash: sellTxHash,
            chainId,
            stepIndex,
            quoteSellAssetAccountId,
            quoteBuyAssetAccountId,
            getState,
          })

          this.emit('status', { stepIndex, status, message, buyTxHash })

          return status
        },
        validate: status => {
          return status === TxStatus.Confirmed || status === TxStatus.Failed
        },
        interval: TRADE_POLL_INTERVAL_MILLISECONDS,
        maxAttempts: Infinity,
      })

      promise.then(() => this.emit('complete', { stepIndex }))

      return cancelPolling
    } catch (e) {
      this.emit('error', e)
    }
  }
}

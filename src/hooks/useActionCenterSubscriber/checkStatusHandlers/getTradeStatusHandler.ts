import { getHopByIndex, swappers } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'

import type { CheckStatusHandlerProps } from './types'

import { getConfig } from '@/config'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { getParts, numberToCrypto } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { actionCenterSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectConfirmedTradeExecution } from '@/state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { store } from '@/state/store'

export const getTradeStatusHandler = async ({
  toast,
  quote,
  stepIndex,
  sellTxHash,
  translate,
  sellAccountId,
}: CheckStatusHandlerProps) => {
  const maybeSwapper = swappers[quote.swapperName]

  if (maybeSwapper === undefined)
    throw new Error(`no swapper matching swapperName '${quote.swapperName}'`)

  const swapper = maybeSwapper

  const hop = getHopByIndex(quote, stepIndex)

  if (!hop) {
    throw new Error(`No hop found for stepIndex ${stepIndex}`)
  }

  const chainId = hop.sellAsset.chainId

  const { status, message, buyTxHash } = await swapper.checkTradeStatus({
    quoteId: quote.id,
    txHash: sellTxHash,
    chainId,
    accountId: sellAccountId,
    stepIndex,
    config: getConfig(),
    assertGetEvmChainAdapter,
    assertGetUtxoChainAdapter,
    assertGetCosmosSdkChainAdapter,
    assertGetSolanaChainAdapter,
    fetchIsSmartContractAddressQuery,
  })

  const firstStep = quote?.steps[0]
  const lastStep = quote?.steps[quote.steps.length - 1]
  const tradeSellAsset = firstStep.sellAsset
  const tradeBuyAsset = lastStep.buyAsset

  const deviceLocale = preferences.selectors.selectCurrencyFormat(store.getState())
  const selectedCurrency = preferences.selectors.selectSelectedCurrency(store.getState())
  const localeParts = getParts(deviceLocale, selectedCurrency)
  const tradeExecution = selectConfirmedTradeExecution(store.getState())

  // @TODO: use real amounts as we got the txHash already
  if (status === TxStatus.Confirmed) {
    const notificationTitle = translate('notificationCenter.notificationsTitles.swap.confirmed', {
      sellAmountAndSymbol: numberToCrypto(
        fromBaseUnit(
          firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          tradeSellAsset.precision,
        ),
        tradeSellAsset.symbol,
        localeParts,
        {
          maximumFractionDigits: 8,
          omitDecimalTrailingZeros: true,
          abbreviated: true,
          truncateLargeNumbers: true,
        },
      ),
      buyAmountAndSymbol: numberToCrypto(
        fromBaseUnit(lastStep.buyAmountAfterFeesCryptoBaseUnit, tradeBuyAsset.precision),
        tradeBuyAsset.symbol,
        localeParts,
        {
          maximumFractionDigits: 8,
          omitDecimalTrailingZeros: true,
          abbreviated: true,
          truncateLargeNumbers: true,
        },
      ),
    })
    store.dispatch(
      actionCenterSlice.actions.updateAction({
        title: notificationTitle,
        metadata: {
          swapId: quote.id,
        },
        status: ActionStatus.Complete,
        assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
      }),
    )

    // We are not inside the swapper, we need to send a toast to notify the user that the swap finished
    if (tradeExecution?.state !== TradeExecutionState.TradeComplete) {
      toast({
        title: notificationTitle,
        status: 'success',
      })
    }
  }

  if (status === TxStatus.Failed) {
    store.dispatch(
      actionCenterSlice.actions.updateAction({
        title: translate('notificationCenter.notificationsTitles.swap.failed'),
        status: ActionStatus.Failed,
        assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
        metadata: {
          swapId: quote.id,
        },
      }),
    )

    // We are not inside the swapper, we need to send a toast to notify the user that the swap failed
    if (tradeExecution?.state !== TradeExecutionState.TradeComplete) {
      toast({
        title: translate('notificationCenter.notificationsTitles.swap.failed'),
        status: 'error',
      })
    }
  }

  return {
    status,
    message,
    buyTxHash,
  }
}

import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { fetchSafeTransactionInfo, swappers, SwapStatus } from '@shapeshiftoss/swapper'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'

import type { SwapCheckStatusHandlerProps } from './types'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { getParts, numberToCrypto } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { getTxLink } from '@/lib/getTxLink'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { actionCenterSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectActionBySwapId, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { store } from '@/state/store'

export const getTradeStatusHandler = async ({
  toast,
  swap,
  translate,
}: SwapCheckStatusHandlerProps) => {
  const maybeSwapper = swappers[swap.swapperName]

  if (maybeSwapper === undefined)
    throw new Error(`no swapper matching swapperName '${swap.swapperName}'`)

  const swapper = maybeSwapper

  if (!swap.sellAccountId) return
  if (!swap.sellTxHash) return

  const { status, message, buyTxHash } = await swapper.checkTradeStatus({
    quoteId: swap.quoteId.toString(),
    txHash: swap.sellTxHash,
    chainId: swap.sellAsset.chainId,
    accountId: swap.sellAccountId,
    stepIndex: swap.metadata.stepIndex,
    swap,
    config: getConfig(),
    assertGetEvmChainAdapter,
    assertGetUtxoChainAdapter,
    assertGetCosmosSdkChainAdapter,
    assertGetSolanaChainAdapter,
    fetchIsSmartContractAddressQuery,
  })

  if (!buyTxHash) return

  const tradeSellAsset = swap.sellAsset
  const tradeBuyAsset = swap.buyAsset

  const deviceLocale = preferences.selectors.selectCurrencyFormat(store.getState())
  const selectedCurrency = preferences.selectors.selectSelectedCurrency(store.getState())
  const localeParts = getParts(deviceLocale, selectedCurrency)

  if (status === TxStatus.Confirmed) {
    const accountId = swap.sellAccountId
    const adapter = getChainAdapterManager().get(swap.sellAsset.chainId)

    if (adapter) {
      try {
        const tx = await (adapter as EvmChainAdapter).httpProvider.getTransaction({
          txid: buyTxHash,
        })

        const parsedTx = await adapter.parseTx(tx, fromAccountId(accountId).account)

        const feeAsset = selectFeeAssetByChainId(store.getState(), parsedTx?.chainId ?? '')

        const maybeSafeTx = await fetchSafeTransactionInfo({
          accountId,
          safeTxHash: buyTxHash,
          fetchIsSmartContractAddressQuery,
        })

        const txLink = getTxLink({
          stepSource: parsedTx.trade?.dexName,
          defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
          txId: tx.txid,
          maybeSafeTx,
          accountId,
        })

        if (parsedTx.transfers?.length) {
          const receiveTransfer = parsedTx.transfers.find(
            transfer =>
              transfer.type === TransferType.Receive && transfer.assetId === tradeBuyAsset.assetId,
          )

          if (receiveTransfer?.value) {
            store.dispatch(
              swapSlice.actions.updateSwap({
                id: swap.id,
                buyAmountCryptoBaseUnit: receiveTransfer.value,
              }),
            )

            const notificationTitle = translate('notificationCenter.notificationTitle', {
              sellAmountAndSymbol: numberToCrypto(
                fromBaseUnit(swap.sellAmountCryptoBaseUnit, tradeSellAsset.precision),
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
                fromBaseUnit(receiveTransfer.value, tradeBuyAsset.precision),
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
                  swapId: swap.id,
                },
                status: ActionStatus.Complete,
                assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
              }),
            )
            store.dispatch(
              swapSlice.actions.updateSwap({
                id: swap.id,
                status: SwapStatus.Success,
                txLink,
              }),
            )

            // @TODO: do we want to show this even if the user is on the trade confirmation page?
            toast({
              title: notificationTitle,
              status: 'success',
            })
            return
          }
        }
      } catch (error) {
        console.error('Failed to fetch transaction details:', error)

        store.dispatch(
          actionCenterSlice.actions.updateAction({
            metadata: {
              swapId: swap.id,
            },
            status: ActionStatus.Complete,
            assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
          }),
        )
        store.dispatch(
          swapSlice.actions.updateSwap({
            id: swap.id,
            status: SwapStatus.Success,
          }),
        )

        const notificationTitle = selectActionBySwapId(store.getState(), {
          swapId: swap.id,
        })?.title

        // @TODO: do we want to show this even if the user is on the trade confirmation page?
        toast({
          title: notificationTitle,
          status: 'success',
        })

        return
      }
    }

    const notificationTitle = translate('notificationCenter.notificationTitle', {
      sellAmountAndSymbol: numberToCrypto(
        fromBaseUnit(swap.sellAmountCryptoBaseUnit, tradeSellAsset.precision),
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
        fromBaseUnit(swap.buyAmountCryptoBaseUnit, tradeBuyAsset.precision),
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
        metadata: {
          swapId: swap.id,
        },
        status: ActionStatus.Complete,
        assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
      }),
    )
    store.dispatch(
      swapSlice.actions.updateSwap({
        id: swap.id,
        status: SwapStatus.Success,
      }),
    )

    // @TODO: do we want to show this even if the user is on the trade confirmation page?
    toast({
      title: notificationTitle,
      status: 'success',
    })
  }

  if (status === TxStatus.Failed) {
    store.dispatch(
      actionCenterSlice.actions.updateAction({
        title: translate('notificationCenter.notificationTitle'),
        status: ActionStatus.Failed,
        assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
        metadata: {
          swapId: swap.id,
        },
      }),
    )
    store.dispatch(
      swapSlice.actions.updateSwap({
        id: swap.id,
        status: SwapStatus.Failed,
      }),
    )

    toast({
      title: translate('notificationCenter.notificationTitle'),
      status: 'error',
    })
  }

  return {
    status,
    message,
    buyTxHash,
  }
}

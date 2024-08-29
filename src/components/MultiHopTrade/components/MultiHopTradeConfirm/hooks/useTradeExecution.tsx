import type { StdSignDoc } from '@keplr-wallet/types'
import { bchAssetId, CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId, SignTx, SignTypedDataInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { BuildCustomTxInput } from '@shapeshiftoss/chain-adapters/src/evm/types'
import type { BTCSignTx, ETHSignTypedData, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type {
  EvmTransactionRequest,
  SupportedTradeQuoteStepIndex,
  TradeQuote,
} from '@shapeshiftoss/swapper'
import { getHopByIndex, SwapperName, TradeExecutionEvent } from '@shapeshiftoss/swapper'
import { LIFI_TRADE_POLL_INTERVAL_MILLISECONDS } from '@shapeshiftoss/swapper/dist/swappers/LifiSwapper/LifiSwapper'
import type { TypedData } from 'eip-712'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { TradeExecution } from 'lib/tradeExecution'
import { assertUnreachable } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, signAndBroadcast } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { selectAssetById, selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectHopSellAccountId,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useMixpanel } from './useMixpanel'

export const useTradeExecution = (
  hopIndex: SupportedTradeQuoteStepIndex,
  confirmedTradeId: TradeQuote['id'],
) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const { showErrorToast } = useErrorHandler()
  const trackMixpanelEvent = useMixpanel()
  const hasMixpanelSuccessOrFailFiredRef = useRef(false)
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })

  const hopSellAccountIdFilter = useMemo(() => {
    return {
      hopIndex,
    }
  }, [hopIndex])

  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const accountMetadataFilter = useMemo(
    () => ({ accountId: sellAssetAccountId }),
    [sellAssetAccountId],
  )
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )
  const swapperName = useAppSelector(selectActiveSwapperName)
  const tradeQuote = useAppSelector(selectActiveQuote)

  // This is ugly, but we need to use refs to get around the fact that the
  // poll fn effectively creates a closure and will hold stale variables forever
  // Unless we use refs or another way to get around the closure (e.g hijacking `this`, we are doomed)
  const cancelPollingRef = useRef<() => void | undefined>()

  // cancel on component unmount so polling doesn't cause chaos after the component has unmounted
  useEffect(() => {
    return cancelPollingRef.current
  }, [])

  // The intermediary buy asset may not actually be supported. If it doesn't exist in the asset slice
  // then it must be unsupported.
  const supportedBuyAsset = useAppSelector(state =>
    selectAssetById(state, tradeQuote?.steps[hopIndex]?.buyAsset.assetId ?? ''),
  )

  const executeTrade = useCallback(() => {
    if (!wallet) throw Error('missing wallet')
    if (!accountMetadata) throw Error('missing accountMetadata')
    if (!tradeQuote) throw Error('missing tradeQuote')
    if (!swapperName) throw Error('missing swapperName')
    if (!sellAssetAccountId) throw Error('missing sellAssetAccountId')

    const hop = getHopByIndex(tradeQuote, hopIndex)

    if (!hop) throw Error(`Current hop is undefined: ${hopIndex}`)

    return new Promise<void>(async resolve => {
      dispatch(tradeQuoteSlice.actions.setSwapTxPending({ hopIndex, id: confirmedTradeId }))

      const onFail = (e: unknown) => {
        const { message } = (e ?? { message: undefined }) as { message?: string }
        dispatch(
          tradeQuoteSlice.actions.setSwapTxMessage({ hopIndex, message, id: confirmedTradeId }),
        )
        dispatch(tradeQuoteSlice.actions.setSwapTxFailed({ hopIndex, id: confirmedTradeId }))
        showErrorToast(e)

        if (!hasMixpanelSuccessOrFailFiredRef.current) {
          trackMixpanelEvent(MixPanelEvent.TradeFailed)
          hasMixpanelSuccessOrFailFiredRef.current = true
        }

        resolve()
      }

      // only track after swapper successfully executes a trade
      // otherwise unsigned txs will be tracked as confirmed trades
      const trackMixpanelEventOnExecute = () => {
        const event =
          hopIndex === 0 ? MixPanelEvent.TradeConfirm : MixPanelEvent.TradeConfirmSecondHop
        trackMixpanelEvent(event)
      }

      const execution = new TradeExecution()

      if (swapperName === SwapperName.LIFI) {
        execution.setPollInterval(LIFI_TRADE_POLL_INTERVAL_MILLISECONDS)
      }

      let txHashReceived: boolean = false

      execution.on(TradeExecutionEvent.SellTxHash, ({ sellTxHash }) => {
        txHashReceived = true
        dispatch(
          tradeQuoteSlice.actions.setSwapSellTxHash({ hopIndex, sellTxHash, id: confirmedTradeId }),
        )
      })
      execution.on(TradeExecutionEvent.Status, ({ buyTxHash, message }) => {
        dispatch(
          tradeQuoteSlice.actions.setSwapTxMessage({ hopIndex, message, id: confirmedTradeId }),
        )
        if (buyTxHash) {
          txHashReceived = true
          dispatch(
            tradeQuoteSlice.actions.setSwapBuyTxHash({ hopIndex, buyTxHash, id: confirmedTradeId }),
          )
        }
      })
      execution.on(TradeExecutionEvent.Success, ({ buyTxHash }) => {
        if (buyTxHash) {
          txHashReceived = true
          dispatch(
            tradeQuoteSlice.actions.setSwapBuyTxHash({ hopIndex, buyTxHash, id: confirmedTradeId }),
          )
        }

        if (!txHashReceived) {
          showErrorToast(Error('missing txHash'))
          resolve()
          return
        }

        dispatch(
          tradeQuoteSlice.actions.setSwapTxMessage({
            hopIndex,
            message: translate('trade.transactionSuccessful'),
            id: confirmedTradeId,
          }),
        )

        // Prevent "where's my money" support messages:
        // Once the transaction is successful, we must wait for the node to transmit the tx(s)
        // to the tx history slice so we can render accurate account balance on completion.
        // BUT only do this if the asset we're waiting on is actually supported, since it will never
        // be indexed in the negative case. This occurs with multi-hop trades where the intermediary
        // asset isn't supported by our asset service.
        const isBuyAssetSupported = supportedBuyAsset !== undefined
        if (isBuyAssetSupported) {
          // TODO: temporarily disabled until we circle back to implement this properly
          // Temporary UI will be used to bypass balance display after a trade to sidestep the
          // issue in the interim.
          // await dispatch(waitForTransactionHash(txHash)).unwrap()
        }
        dispatch(tradeQuoteSlice.actions.setSwapTxComplete({ hopIndex, id: confirmedTradeId }))

        const isLastHop = hopIndex === tradeQuote.steps.length - 1
        if (isLastHop && !hasMixpanelSuccessOrFailFiredRef.current) {
          trackMixpanelEvent(MixPanelEvent.TradeSuccess)
          hasMixpanelSuccessOrFailFiredRef.current = true
        }

        resolve()
      })
      execution.on(TradeExecutionEvent.Fail, onFail)
      execution.on(TradeExecutionEvent.Error, onFail)

      const { accountType, bip44Params } = accountMetadata
      const accountNumber = bip44Params.accountNumber
      const stepSellAssetChainId = hop.sellAsset.chainId
      const stepSellAssetAssetId = hop.sellAsset.assetId
      const stepBuyAssetAssetId = hop.buyAsset.assetId

      if (swapperName === SwapperName.CowSwap) {
        const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)
        const from = await adapter.getAddress({
          accountNumber,
          wallet,
          checkLedgerAppOpenIfLedgerConnected,
        })

        const output = await execution.execEvmMessage({
          swapperName,
          tradeQuote,
          stepIndex: hopIndex,
          slippageTolerancePercentageDecimal,
          from,
          signMessage: async (message: TypedData) => {
            const typedDataToSign: ETHSignTypedData = {
              addressNList: toAddressNList(bip44Params),
              typedData: message,
            }

            const signTypedDataInput: SignTypedDataInput<ETHSignTypedData> = {
              typedDataToSign,
              wallet,
              checkLedgerAppOpenIfLedgerConnected,
            }

            const output = await adapter.signTypedData(signTypedDataInput)

            trackMixpanelEventOnExecute()
            return output
          },
        })

        cancelPollingRef.current = output?.cancelPolling
        return
      }

      const { chainNamespace: stepSellAssetChainNamespace } = fromChainId(stepSellAssetChainId)

      const receiverAddress =
        tradeQuote.receiveAddress && stepBuyAssetAssetId === bchAssetId
          ? tradeQuote.receiveAddress.replace('bitcoincash:', '')
          : tradeQuote.receiveAddress

      switch (stepSellAssetChainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)
          const from = await adapter.getAddress({
            accountNumber,
            wallet,
            checkLedgerAppOpenIfLedgerConnected,
          })
          const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

          const output = await execution.execEvmTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            supportsEIP1559,
            signAndBroadcastTransaction: async (transactionRequest: EvmTransactionRequest) => {
              const { txToSign } = await adapter.buildCustomTx({
                ...transactionRequest,
                wallet,
                accountNumber,
                checkLedgerAppOpenIfLedgerConnected,
              } as BuildCustomTxInput)

              const output = await signAndBroadcast({
                adapter,
                txToSign,
                wallet,
                senderAddress: from,
                receiverAddress,
                checkLedgerAppOpenIfLedgerConnected,
              })

              trackMixpanelEventOnExecute()
              return output
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        case CHAIN_NAMESPACE.Utxo: {
          if (accountType === undefined) throw Error('Missing UTXO account type')
          const adapter = assertGetUtxoChainAdapter(stepSellAssetChainId)
          const { xpub } = await adapter.getPublicKey(wallet, accountNumber, accountType)
          const _senderAddress = await adapter.getAddress({
            accountNumber,
            accountType,
            wallet,
            checkLedgerAppOpenIfLedgerConnected,
          })
          const senderAddress =
            stepSellAssetAssetId === bchAssetId
              ? _senderAddress.replace('bitcoincash:', '')
              : _senderAddress

          const output = await execution.execUtxoTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            xpub,
            accountType,
            signAndBroadcastTransaction: async (txToSign: BTCSignTx) => {
              const signedTx = await adapter.signTransaction({
                txToSign,
                wallet,
                checkLedgerAppOpenIfLedgerConnected,
              })

              const output = await adapter.broadcastTransaction({
                senderAddress,
                receiverAddress,
                hex: signedTx,
              })

              trackMixpanelEventOnExecute()
              return output
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        case CHAIN_NAMESPACE.CosmosSdk: {
          const adapter = assertGetCosmosSdkChainAdapter(stepSellAssetChainId)
          const from = await adapter.getAddress({
            accountNumber,
            wallet,
            checkLedgerAppOpenIfLedgerConnected,
          })
          const output = await execution.execCosmosSdkTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            signAndBroadcastTransaction: async (transactionRequest: StdSignDoc) => {
              const txToSign: SignTx<CosmosSdkChainId> = {
                addressNList: toAddressNList(bip44Params),
                tx: {
                  fee: {
                    amount: [...transactionRequest.fee.amount],
                    gas: transactionRequest.fee.gas,
                  },
                  memo: transactionRequest.memo,
                  msg: [...transactionRequest.msgs],
                  signatures: [],
                },
                sequence: transactionRequest.sequence,
                account_number: transactionRequest.account_number,
                chain_id: transactionRequest.chain_id,
              }
              const signedTx = await adapter.signTransaction({
                txToSign: txToSign as ThorchainSignTx, // TODO: fix cosmos sdk types in hdwallet-core as they misalign and require casting,
                wallet,
                checkLedgerAppOpenIfLedgerConnected,
              })
              const output = await adapter.broadcastTransaction({
                senderAddress: from,
                receiverAddress: tradeQuote.receiveAddress,
                hex: signedTx,
              })

              trackMixpanelEventOnExecute()
              return output
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        default:
          assertUnreachable(stepSellAssetChainNamespace)
      }
    })
  }, [
    wallet,
    accountMetadata,
    tradeQuote,
    swapperName,
    sellAssetAccountId,
    hopIndex,
    dispatch,
    confirmedTradeId,
    showErrorToast,
    trackMixpanelEvent,
    translate,
    supportedBuyAsset,
    slippageTolerancePercentageDecimal,
    checkLedgerAppOpenIfLedgerConnected,
  ])

  return executeTrade
}

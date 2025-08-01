import { bchAssetId, CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { SignTx, SignTypedDataInput } from '@shapeshiftoss/chain-adapters'
import { ChainAdapterError, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTypedData, SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { SupportedTradeQuoteStepIndex, TradeQuote } from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  isExecutableTradeQuote,
  SolanaLogsError,
  SwapperName,
  TradeExecutionEvent,
} from '@shapeshiftoss/swapper'
import type { CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/types'
import type { TypedData } from 'eip-712'
import camelCase from 'lodash/camelCase'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'

import { useMixpanel } from './useMixpanel'

import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { TradeExecution } from '@/lib/tradeExecution'
import { assertUnreachable } from '@/lib/utils'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, signAndBroadcast } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import {
  selectAssetById,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectHopExecutionMetadata,
  selectHopSellAccountId,
  selectTradeSlippagePercentageDecimal,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useTradeExecution = (
  hopIndex: SupportedTradeQuoteStepIndex,
  confirmedTradeId: TradeQuote['id'],
) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const { showErrorToast } = useErrorToast()
  const trackMixpanelEvent = useMixpanel()
  const hasMixpanelSuccessOrFailFiredRef = useRef(false)

  const hopSellAccountIdFilter = useMemo(() => {
    return {
      hopIndex,
    }
  }, [hopIndex])

  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: confirmedTradeId,
      hopIndex,
    }
  }, [confirmedTradeId, hopIndex])

  const { permit2 } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
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
  const cancelPollingRef = useRef<() => void | undefined>(undefined)

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
        const message = (() => {
          if (e instanceof SolanaLogsError) {
            return translate(`trade.errors.${camelCase(e.name)}`)
          }

          if (e instanceof ChainAdapterError) {
            return translate(e.metadata.translation, e.metadata.options)
          }
          return (e as Error).message ?? undefined
        })()

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

      let txHashReceived: boolean = false

      execution.on(TradeExecutionEvent.SellTxHash, ({ sellTxHash }) => {
        txHashReceived = true
        dispatch(
          tradeQuoteSlice.actions.setSwapSellTxHash({ hopIndex, sellTxHash, id: confirmedTradeId }),
        )
      })
      execution.on(
        TradeExecutionEvent.RelayerTxHash,
        ({ relayerTxHash, relayerExplorerTxLink }) => {
          txHashReceived = true
          dispatch(
            tradeQuoteSlice.actions.setSwapRelayerTxDetails({
              hopIndex,
              relayerTxHash,
              relayerExplorerTxLink,
              id: confirmedTradeId,
            }),
          )
        },
      )
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
      const stepBuyAssetAssetId = hop.buyAsset.assetId

      if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

      if (swapperName === SwapperName.CowSwap) {
        const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)
        const from = await adapter.getAddress({ accountNumber, wallet })

        const output = await execution.execEvmMessage({
          swapperName,
          tradeQuote,
          stepIndex: hopIndex,
          slippageTolerancePercentageDecimal,
          from,
          signMessage: async (message: TypedData) => {
            const typedDataToSign: ETHSignTypedData = {
              addressNList: toAddressNList(adapter.getBip44Params(bip44Params)),
              typedData: message,
            }

            const signTypedDataInput: SignTypedDataInput<ETHSignTypedData> = {
              typedDataToSign,
              wallet,
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
        stepBuyAssetAssetId === bchAssetId
          ? tradeQuote.receiveAddress.replace('bitcoincash:', '')
          : tradeQuote.receiveAddress

      switch (stepSellAssetChainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)

          const from = await adapter.getAddress({ accountNumber, wallet })
          const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

          const output = await execution.execEvmTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            supportsEIP1559,
            permit2Signature: permit2.permit2Signature,
            signAndBroadcastTransaction: async (txToSign: SignTx<EvmChainId>) => {
              const output = await signAndBroadcast({
                adapter,
                txToSign,
                wallet,
                senderAddress: from,
                receiverAddress,
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
          const senderAddress = await adapter.getAddress({ accountNumber, accountType, wallet })

          const output = await execution.execUtxoTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            xpub,
            senderAddress,
            accountType,
            signAndBroadcastTransaction: async (txToSign: SignTx<UtxoChainId>) => {
              const signedTx = await adapter.signTransaction({ txToSign, wallet })
              const output = await adapter.broadcastTransaction({ hex: signedTx })

              trackMixpanelEventOnExecute()
              return output
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        case CHAIN_NAMESPACE.CosmosSdk: {
          const adapter = assertGetCosmosSdkChainAdapter(stepSellAssetChainId)

          const from = await adapter.getAddress({ accountNumber, wallet })

          const output = await execution.execCosmosSdkTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            signAndBroadcastTransaction: async (txToSign: SignTx<CosmosSdkChainId>) => {
              const hex = await adapter.signTransaction({ txToSign, wallet })

              const output = await adapter.broadcastTransaction({
                senderAddress: from,
                receiverAddress,
                hex,
              })

              trackMixpanelEventOnExecute()
              return output
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        case CHAIN_NAMESPACE.Solana: {
          const adapter = assertGetSolanaChainAdapter(stepSellAssetChainId)

          const from = await adapter.getAddress({ accountNumber, wallet })

          const output = await execution.execSolanaTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            signAndBroadcastTransaction: async (txToSign: SolanaSignTx) => {
              const hex = await adapter.signTransaction({ txToSign, wallet })

              const output = await adapter.broadcastTransaction({
                senderAddress: from,
                receiverAddress,
                hex,
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
    permit2.permit2Signature,
  ])

  return executeTrade
}

import { bchAssetId, CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import type { SignTx, SignTypedDataInput } from '@shapeshiftoss/chain-adapters'
import { ChainAdapterError, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTypedData, SolanaSignTx, SuiSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { isGridPlus } from '@shapeshiftoss/hdwallet-gridplus'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { SupportedTradeQuoteStepIndex, TradeQuote } from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  isExecutableTradeQuote,
  SolanaLogsError,
  SwapperName,
  TradeExecutionEvent,
} from '@shapeshiftoss/swapper'
import type { CosmosSdkChainId, EvmChainId, TronChainId, UtxoChainId } from '@shapeshiftoss/types'
import type { TypedData } from 'eip-712'
import camelCase from 'lodash/camelCase'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useMixpanel } from './useMixpanel'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { SwapNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/SwapNotification'
import { getMixpanelEventData } from '@/components/MultiHopTrade/helpers'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { HypeLabEvent, trackHypeLabEvent } from '@/lib/hypelab/hypelabSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { TradeExecution } from '@/lib/tradeExecution'
import { assertUnreachable } from '@/lib/utils'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, signAndBroadcast } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetSuiChainAdapter } from '@/lib/utils/sui'
import { assertGetTronChainAdapter } from '@/lib/utils/tron'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import {
  selectAssetById,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectHopExecutionMetadata,
  selectHopSellAccountId,
  selectIsQuickBuy,
  selectTradeSlippagePercentageDecimal,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useTradeExecution = (
  hopIndex: SupportedTradeQuoteStepIndex,
  confirmedTradeId: TradeQuote['id'],
) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const { showErrorToast } = useErrorToast()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
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
  const activeSwapId = useAppSelector(swapSlice.selectors.selectActiveSwapId)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const isQuickBuy = useAppSelector(selectIsQuickBuy)

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

      // Capture event data once at the start, before any state changes
      const eventDataSnapshot = getMixpanelEventData()

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
          trackMixpanelEvent(MixPanelEvent.TradeFailed, eventDataSnapshot)
          hasMixpanelSuccessOrFailFiredRef.current = true
        }

        resolve()
      }

      // only track after swapper successfully executes a trade
      // otherwise unsigned txs will be tracked as confirmed trades
      const trackMixpanelEventOnExecute = () => {
        const event =
          hopIndex === 0 ? MixPanelEvent.TradeConfirm : MixPanelEvent.TradeConfirmSecondHop
        trackMixpanelEvent(event, eventDataSnapshot)
        if (hopIndex === 0) {
          trackHypeLabEvent(HypeLabEvent.TradeConfirm)
        }
      }

      const execution = new TradeExecution()

      let txHashReceived: boolean = false

      execution.on(TradeExecutionEvent.SellTxHash, ({ sellTxHash }) => {
        txHashReceived = true
        dispatch(
          tradeQuoteSlice.actions.setSwapSellTxHash({ hopIndex, sellTxHash, id: confirmedTradeId }),
        )
        dispatch(tradeInput.actions.setSellAmountCryptoPrecision('0'))

        const swap = activeSwapId ? swapsById[activeSwapId] : undefined
        if (swap) {
          // No double-toasty
          if (toast.isActive(swap.id)) return

          toast({
            id: swap.id,
            status: 'info',
            render: ({ onClose, ...props }) => {
              const handleClick = () => {
                onClose()
                openActionCenter()
              }

              return (
                <SwapNotification
                  handleClick={handleClick}
                  swapId={swap.id}
                  onClose={onClose}
                  {...props}
                />
              )
            },
          })
        }

        // Don't navigate away during QuickBuy - let the QuickBuy component handle the success state
        if (!isQuickBuy) {
          navigate(TradeRoutePaths.Input)
        }
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
      execution.on(
        TradeExecutionEvent.Status,
        ({ buyTxHash, message, actualBuyAmountCryptoBaseUnit }) => {
          dispatch(
            tradeQuoteSlice.actions.setSwapTxMessage({ hopIndex, message, id: confirmedTradeId }),
          )
          if (buyTxHash) {
            txHashReceived = true
            dispatch(
              tradeQuoteSlice.actions.setSwapBuyTxHash({
                hopIndex,
                buyTxHash,
                id: confirmedTradeId,
              }),
            )
          }

          // Update the swap with the actual buy amount if available
          // Read fresh state to avoid stale closure - swapsById captured at render time may have outdated status
          if (actualBuyAmountCryptoBaseUnit) {
            const freshActiveSwapId = swapSlice.selectors.selectActiveSwapId(store.getState())
            if (freshActiveSwapId) {
              const currentSwap = swapSlice.selectors.selectSwapsById(store.getState())[
                freshActiveSwapId
              ]
              if (currentSwap) {
                dispatch(
                  swapSlice.actions.upsertSwap({
                    ...currentSwap,
                    actualBuyAmountCryptoBaseUnit,
                  }),
                )
              }
            }
          }
        },
      )
      execution.on(TradeExecutionEvent.Success, ({ buyTxHash, actualBuyAmountCryptoBaseUnit }) => {
        if (buyTxHash) {
          txHashReceived = true
          dispatch(
            tradeQuoteSlice.actions.setSwapBuyTxHash({ hopIndex, buyTxHash, id: confirmedTradeId }),
          )
        }

        // Update the swap with the actual buy amount if available
        // Read fresh state to avoid stale closure - swapsById captured at render time may have outdated status
        if (actualBuyAmountCryptoBaseUnit) {
          const freshActiveSwapId = swapSlice.selectors.selectActiveSwapId(store.getState())
          if (freshActiveSwapId) {
            const currentSwap = swapSlice.selectors.selectSwapsById(store.getState())[
              freshActiveSwapId
            ]
            if (currentSwap) {
              dispatch(
                swapSlice.actions.upsertSwap({
                  ...currentSwap,
                  actualBuyAmountCryptoBaseUnit,
                }),
              )
            }
          }
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
          trackMixpanelEvent(MixPanelEvent.TradeSuccess, eventDataSnapshot)
          trackHypeLabEvent(HypeLabEvent.TradeSuccess)
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

      const skipDeviceDerivation = wallet && (isTrezor(wallet) || isGridPlus(wallet))
      const pubKey = fromAccountId(sellAssetAccountId).account

      if (swapperName === SwapperName.CowSwap) {
        const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)
        const from = await adapter.getAddress({
          accountNumber,
          wallet,
          pubKey: skipDeviceDerivation ? pubKey : undefined,
        })

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

          const from = await adapter.getAddress({
            accountNumber,
            wallet,
            pubKey: skipDeviceDerivation ? pubKey : undefined,
          })
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
              dispatch(
                tradeQuoteSlice.actions.setSwapInboundAddress({
                  hopIndex,
                  inboundAddress: txToSign.to,
                  id: confirmedTradeId,
                }),
              )

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

          const xpub = skipDeviceDerivation
            ? pubKey
            : (await adapter.getPublicKey(wallet, accountNumber, accountType)).xpub
          const senderAddress = await adapter.getAddress({
            accountNumber,
            accountType,
            wallet,
            pubKey: skipDeviceDerivation ? pubKey : undefined,
          })

          const output = await execution.execUtxoTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            xpub,
            senderAddress,
            accountType,
            signAndBroadcastTransaction: async (txToSign: SignTx<UtxoChainId>) => {
              const inboundAddress = txToSign.outputs?.[0]?.address
              if (inboundAddress) {
                dispatch(
                  tradeQuoteSlice.actions.setSwapInboundAddress({
                    hopIndex,
                    inboundAddress,
                    id: confirmedTradeId,
                  }),
                )
              }

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

          const from = await adapter.getAddress({
            accountNumber,
            wallet,
            pubKey: skipDeviceDerivation ? pubKey : undefined,
          })

          const output = await execution.execCosmosSdkTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            signAndBroadcastTransaction: async (txToSign: SignTx<CosmosSdkChainId>) => {
              const inboundAddress = txToSign.tx?.msg?.[0]?.value?.to_address
              if (inboundAddress && typeof inboundAddress === 'string') {
                dispatch(
                  tradeQuoteSlice.actions.setSwapInboundAddress({
                    hopIndex,
                    inboundAddress,
                    id: confirmedTradeId,
                  }),
                )
              }

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

          const from = await adapter.getAddress({
            accountNumber,
            wallet,
            pubKey: skipDeviceDerivation ? pubKey : undefined,
          })

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
        case CHAIN_NAMESPACE.Tron: {
          const adapter = assertGetTronChainAdapter(stepSellAssetChainId)
          const from = await adapter.getAddress({ accountNumber, wallet })

          const output = await execution.execTronTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            signAndBroadcastTransaction: async (txToSign: SignTx<TronChainId>) => {
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
        case CHAIN_NAMESPACE.Sui: {
          const adapter = assertGetSuiChainAdapter(stepSellAssetChainId)

          const from = await adapter.getAddress({
            accountNumber,
            wallet,
            pubKey:
              wallet && isTrezor(wallet) ? fromAccountId(sellAssetAccountId).account : undefined,
          })

          const output = await execution.execSuiTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            signAndBroadcastTransaction: async (txToSign: SuiSignTx) => {
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
    activeSwapId,
    navigate,
    openActionCenter,
    swapsById,
    toast,
    isQuickBuy,
  ])

  return executeTrade
}

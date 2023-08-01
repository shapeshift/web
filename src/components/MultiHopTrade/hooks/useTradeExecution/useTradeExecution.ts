import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Swapper2, Swapper2Api, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { cowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper2'
import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import { lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper2'
import { osmosisApi } from 'lib/swapper/swappers/OsmosisSwapper/endpoints'
import { osmosisSwapper } from 'lib/swapper/swappers/OsmosisSwapper/OsmosisSwapper2'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'
import { assertUnreachable } from 'lib/utils'
import { isEvmChainAdapter } from 'lib/utils/evm'
import {
  selectPortfolioAccountMetadataByAccountId,
  selectUsdRateByAssetId,
} from 'state/slices/selectors'
import {
  selectActiveStepOrDefault,
  selectFirstHopSellFeeAsset,
  selectIsLastStep,
  selectLastHopBuyAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { TRADE_POLL_INTERVAL_MILLISECONDS } from '../constants'
import { useAccountIds } from '../useAccountIds'
import { withFromOrXpub } from './helpers'

export const useTradeExecution = ({
  swapperName,
  tradeQuote,
}: {
  swapperName?: SwapperName
  tradeQuote?: TradeQuote2
}) => {
  const dispatch = useAppDispatch()

  const [sellTxHash, setSellTxHash] = useState<string | undefined>()
  const [buyTxHash, setBuyTxHash] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const [tradeStatus, setTradeStatus] = useState<TxStatus>(TxStatus.Unknown)
  const { poll } = usePoll()
  const wallet = useWallet().state.wallet

  const buyAsset = useAppSelector(selectLastHopBuyAsset)
  const feeAsset = useAppSelector(selectFirstHopSellFeeAsset)

  const { sellAssetAccountId, buyAssetAccountId } = useAccountIds()

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: sellAssetAccountId }),
  )

  const buyAssetUsdRate = useAppSelector(state =>
    buyAsset ? selectUsdRateByAssetId(state, buyAsset.assetId) : undefined,
  )

  const feeAssetUsdRate = useAppSelector(state =>
    feeAsset ? selectUsdRateByAssetId(state, feeAsset.assetId) : undefined,
  )

  const activeStepOrDefault = useAppSelector(selectActiveStepOrDefault)
  const isLastStep = useAppSelector(selectIsLastStep)

  // This is ugly, but we need to use refs to get around the fact that the
  // poll fn effectively creates a closure and will hold stale variables forever
  // Unless we use refs or another way to get around the closure (e.g hijacking `this`, we are doomed)
  const sellTxHashRef = useRef<string | undefined>()
  const isLastStepRef = useRef<boolean>(false)

  const executeTrade = useCallback(async () => {
    if (!wallet) throw Error('missing wallet')
    if (!buyAssetUsdRate) throw Error('missing buyAssetUsdRate')
    if (!feeAssetUsdRate) throw Error('missing feeAssetUsdRate')
    if (!accountMetadata) throw Error('missing accountMetadata')
    if (!tradeQuote) throw Error('missing tradeQuote')
    if (!swapperName) throw Error('missing swapperName')

    const swapper: Swapper2 & Swapper2Api = (() => {
      switch (swapperName) {
        case SwapperName.LIFI:
          return { ...lifiSwapper, ...lifiApi }
        case SwapperName.Thorchain:
          return { ...thorchainSwapper, ...thorchainApi }
        case SwapperName.Zrx:
          return { ...zrxSwapper, ...zrxApi }
        case SwapperName.CowSwap:
          return { ...cowSwapper, ...cowApi }
        case SwapperName.OneInch:
          return { ...oneInchSwapper, ...oneInchApi }
        case SwapperName.Osmosis:
          return { ...osmosisSwapper, ...osmosisApi }
        case SwapperName.Test:
          throw Error('not implemented')
        default:
          assertUnreachable(swapperName)
      }
    })()

    const chainId = tradeQuote.steps[activeStepOrDefault].sellAsset.chainId

    const sellAssetChainAdapter = getChainAdapterManager().get(chainId)

    if (!sellAssetChainAdapter) throw Error(`missing sellAssetChainAdapter for chainId ${chainId}`)

    if (isEvmChainAdapter(sellAssetChainAdapter) && supportsETH(wallet)) {
      await sellAssetChainAdapter.assertSwitchChain(wallet)
    }

    const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

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
        stepIndex: activeStepOrDefault,
        supportsEIP1559,
        buyAssetUsdRate,
        feeAssetUsdRate,
      },
    )

    sellTxHashRef.current = await swapper.executeTrade({
      txToSign: unsignedTxResult,
      wallet,
      chainId,
    })

    setSellTxHash(sellTxHashRef.current)

    await poll({
      fn: async () => {
        // This should never happen, but TS mang
        if (!sellTxHashRef.current) return
        const { status, message, buyTxHash } = await swapper.checkTradeStatus({
          quoteId: tradeQuote.id,
          txHash: sellTxHashRef.current,
          chainId,
          stepIndex: activeStepOrDefault,
          quoteSellAssetAccountId: sellAssetAccountId,
          quoteBuyAssetAccountId: buyAssetAccountId,
          getState: store.getState,
        })

        // TODO(gomes): do we want to bring in the concept of watching for a step execution in addition to trade execution?
        // useTradeExecution seems to revolve around the idea of a holistic trade execution i.e a sell/buy asset for the whole trade,
        // but we may want to make this granular to the step level?
        if (isLastStepRef.current || status === TxStatus.Failed) {
          setMessage(message)
          setBuyTxHash(buyTxHash)
          setTradeStatus(status)
        }

        // Tx confirmed/pending for a mid-trade hop, meaning the trade is still pending holistically
        else if (status === TxStatus.Confirmed || status === TxStatus.Pending) {
          setTradeStatus(TxStatus.Pending)
        }

        return status
      },
      validate: status => {
        return status === TxStatus.Confirmed || status === TxStatus.Failed
      },
      interval: TRADE_POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })

    dispatch(tradeQuoteSlice.actions.incrementStep())
  }, [
    wallet,
    buyAssetUsdRate,
    feeAssetUsdRate,
    accountMetadata,
    tradeQuote,
    swapperName,
    activeStepOrDefault,
    poll,
    dispatch,
    sellAssetAccountId,
    buyAssetAccountId,
  ])

  useEffect(() => {
    sellTxHashRef.current = sellTxHash
    isLastStepRef.current = isLastStep
  }, [sellTxHash, isLastStep])

  useEffect(() => {
    // First step will always be ran from the executeTrade call fired by onSubmit()
    // Subsequent steps will be ran here, following incrementStep() after step completion
    if (activeStepOrDefault !== 0) {
      executeTrade()
    }
  }, [activeStepOrDefault, executeTrade])

  return { executeTrade, sellTxHash, buyTxHash, message, tradeStatus }
}

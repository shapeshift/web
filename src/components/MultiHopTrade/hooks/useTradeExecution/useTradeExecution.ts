import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Swapper2, Swapper2Api, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import { lifi as lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { thorchain as thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { zrx as zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'
import { assertUnreachable, isEvmChainAdapter } from 'lib/utils'
import {
  selectPortfolioAccountMetadataByAccountId,
  selectUsdRateByAssetId,
} from 'state/slices/selectors'
import {
  selectFirstHopSellFeeAsset,
  selectLastHopBuyAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

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
  const [sellTxId, setSellTxId] = useState<string | undefined>()
  const [buyTxId, setBuyTxId] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const [status, setStatus] = useState<TxStatus>(TxStatus.Unknown)
  const { poll } = usePoll()
  const wallet = useWallet().state.wallet

  const buyAsset = useAppSelector(selectLastHopBuyAsset)
  const feeAsset = useAppSelector(selectFirstHopSellFeeAsset)

  const { sellAssetAccountId } = useAccountIds()

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: sellAssetAccountId }),
  )

  const buyAssetUsdRate = useAppSelector(state =>
    buyAsset ? selectUsdRateByAssetId(state, buyAsset.assetId) : undefined,
  )

  const feeAssetUsdRate = useAppSelector(state =>
    feeAsset ? selectUsdRateByAssetId(state, feeAsset.assetId) : undefined,
  )

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
        case SwapperName.Osmosis:
        case SwapperName.OneInch:
        case SwapperName.Test:
          throw Error('not implemented')
        default:
          assertUnreachable(swapperName)
      }
    })()

    const stepIndex = 0 // TODO: multi-hop trades require this to be dynamic
    const chainId = tradeQuote.steps[stepIndex].sellAsset.chainId

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
        stepIndex,
        supportsEIP1559,
        buyAssetUsdRate,
        feeAssetUsdRate,
      },
    )

    const sellTxId = await swapper.executeTrade({
      txToSign: unsignedTxResult,
      wallet,
      chainId,
    })

    setSellTxId(sellTxId)

    await poll({
      fn: async () => {
        const { status, message, buyTxId } = await swapper.checkTradeStatus({
          tradeId: tradeQuote.id,
          txId: sellTxId,
        })

        setMessage(message)
        setBuyTxId(buyTxId)
        setStatus(status)

        return status
      },
      validate: status => status === TxStatus.Confirmed,
      interval: TRADE_POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [wallet, buyAssetUsdRate, feeAssetUsdRate, accountMetadata, tradeQuote, swapperName, poll])

  return { executeTrade, sellTxId, buyTxId, message, status }
}

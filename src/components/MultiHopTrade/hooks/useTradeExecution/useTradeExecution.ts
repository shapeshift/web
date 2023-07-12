import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
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
  const [sellTxHash, setSellTxHash] = useState<string | undefined>()
  const [buyTxHash, setBuyTxHash] = useState<string | undefined>()
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

    const sellTxHash = await swapper.executeTrade({
      txToSign: unsignedTxResult,
      wallet,
      chainId,
    })

    setSellTxHash(sellTxHash)

    await poll({
      fn: async () => {
        const { status, message, buyTxHash } = await swapper.checkTradeStatus({
          quoteId: tradeQuote.id,
          txHash: sellTxHash,
          chainId,
        })

        setMessage(message)
        setBuyTxHash(buyTxHash)
        setStatus(status)

        return status
      },
      validate: status => status === TxStatus.Confirmed || status === TxStatus.Failed,
      interval: TRADE_POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [wallet, buyAssetUsdRate, feeAssetUsdRate, accountMetadata, tradeQuote, swapperName, poll])

  return { executeTrade, sellTxHash, buyTxHash, message, status }
}

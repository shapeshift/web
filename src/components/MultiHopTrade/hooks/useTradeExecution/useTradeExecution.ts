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
import { assertUnreachable, isEvmChainAdapter } from 'lib/utils'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
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

  const { sellAssetAccountId } = useAccountIds()

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: sellAssetAccountId }),
  )

  const executeTrade = useCallback(async () => {
    if (!wallet) throw Error('missing wallet')
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
        const { status, message, buyTxId } = await swapper.checkTradeStatus(tradeQuote.id)

        setMessage(message)
        setBuyTxId(buyTxId)
        setStatus(status)

        return status
      },
      validate: status => status === TxStatus.Confirmed,
      interval: TRADE_POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [poll, accountMetadata, swapperName, tradeQuote, wallet])

  return { executeTrade, sellTxId, buyTxId, message, status }
}

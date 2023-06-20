import type { UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import { useCallback, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Swapper2, TradeQuote } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { lifi } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { thorchain } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { assertUnreachable } from 'lib/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TRADE_POLL_INTERVAL_MILLISECONDS } from './constants'
import { useAccountIds } from './useAccountIds'

export const useTradeExecution = ({
  swapperName,
  tradeQuote,
  receiveAddress,
  affiliateBps,
}: {
  swapperName: SwapperName
  tradeQuote: TradeQuote
  receiveAddress: string
  affiliateBps: string
}) => {
  const [txId, setTxId] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const { poll } = usePoll()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet

  const { sellAssetAccountId } = useAccountIds({
    sellAsset: tradeQuote.steps[0].sellAsset,
  })

  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: sellAssetAccountId }),
  )

  const executeTrade = useCallback(async () => {
    if (!wallet) throw Error('missing wallet')
    if (!sellAccountMetadata) throw Error('missing sellAccountMetadata')

    const {
      accountType,
      bip44Params: { accountNumber },
    } = sellAccountMetadata

    const swapper: Swapper2 = (() => {
      switch (swapperName) {
        case SwapperName.LIFI:
          return lifi
        case SwapperName.Thorchain:
          return thorchain
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

    try {
      const chainId = tradeQuote.steps[0].sellAsset.chainId

      const { xpub } = await (async (): Promise<{ xpub?: string }> => {
        if (!isUtxoChainId(chainId)) return {}
        const sellAssetChainAdapter = getChainAdapterManager().get(
          chainId,
        ) as unknown as UtxoChainAdapter

        if (!accountType) throw Error('missing accountType')

        return await sellAssetChainAdapter.getPublicKey(wallet, accountNumber, accountType)
      })()

      const txId = await swapper.executeTrade({
        tradeQuote,
        wallet,
        receiveAddress,
        affiliateBps,
        xpub,
        accountType,
      })

      setTxId(txId)

      await poll({
        fn: async () => {
          const tradeStatusData = await swapper.checkTradeStatus(txId)

          setMessage(tradeStatusData.message)

          return tradeStatusData.isComplete
        },
        validate: isComplete => isComplete === true,
        interval: TRADE_POLL_INTERVAL_MILLISECONDS,
        maxAttempts: Infinity,
      })
    } catch (e) {
      showErrorToast(e)
    }
  }, [
    affiliateBps,
    poll,
    receiveAddress,
    sellAccountMetadata,
    showErrorToast,
    swapperName,
    tradeQuote,
    wallet,
  ])

  return { executeTrade, txId, message }
}

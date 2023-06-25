import { supportsETH, supportsEthSwitchChain } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Swapper2, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { lifi } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { thorchain } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { assertUnreachable, isEvmChainAdapter } from 'lib/utils'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TRADE_POLL_INTERVAL_MILLISECONDS } from './constants'
import { useAccountIds } from './useAccountIds'

export const useTradeExecution = ({
  swapperName,
  tradeQuote,
}: {
  swapperName: SwapperName
  tradeQuote: TradeQuote2
}) => {
  const [sellTxId, setSellTxId] = useState<string | undefined>()
  const [buyTxId, setBuyTxId] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const [status, setStatus] = useState<TxStatus>(TxStatus.Unknown)
  const { poll } = usePoll()
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

    const stepIndex = 0 // TODO: multi-hop trades require this to be dynamic
    const chainId = tradeQuote.steps[stepIndex].sellAsset.chainId

    const sellAssetChainAdapter = getChainAdapterManager().get(chainId)

    if (!sellAssetChainAdapter) throw Error(`missing sellAssetChainAdapter for chainId ${chainId}`)

    if (isEvmChainAdapter(sellAssetChainAdapter)) {
      if (!supportsEthSwitchChain(wallet)) throw Error(`wallet cannot switch to chainId ${chainId}`)
      await sellAssetChainAdapter.assertSwitchChain(wallet)
    }

    const from = await sellAssetChainAdapter.getAddress({ wallet, accountNumber })
    const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

    const unsignedTxResult = await swapper.getUnsignedTx({
      from,
      tradeQuote,
      chainId,
      accountMetadata: sellAccountMetadata,
      stepIndex,
      supportsEIP1559,
    })

    const sellTxId = await swapper.executeTrade({
      txToExecute: unsignedTxResult,
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
  }, [poll, sellAccountMetadata, swapperName, tradeQuote, wallet])

  return { executeTrade, sellTxId, buyTxId, message, status }
}

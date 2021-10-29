import { chainAdapters } from '@shapeshiftoss/types'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'

type TransactionsProviderProps = {
  children: React.ReactNode
}

export const TransactionsProvider = ({ children }: TransactionsProviderProps): JSX.Element => {
  const dispatch = useDispatch()
  const {
    state: { wallet, walletInfo }
  } = useWallet()
  const chainAdapter = useChainAdapters()

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const supportedAdapters = chainAdapter.getSupportedAdapters()

      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const key = adapter.getType()
        try {
          const address = await adapter.getAddress({ wallet })
          if (!address) return
          await adapter.subscribeTxs(
            { addresses: [address] },
            (msg: chainAdapters.SubscribeTxsMessage<typeof key>) => {
              dispatch(txHistory.actions.onMessage({ message: msg }))
            },
            (err: any) => console.error(err)
          )
        } catch (e) {
          console.error('TransactionProvider: Error subscribing to transaction history', e)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, walletInfo?.deviceId])

  return <>{children}</>
}

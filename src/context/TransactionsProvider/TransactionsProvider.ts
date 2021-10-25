import { chainAdapters } from '@shapeshiftoss/types'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const TransactionsProvider: React.FC = ({ children }) => {
  const dispatch = useDispatch()
  const {
    state: { wallet, walletInfo }
  } = useWallet()
  const chainAdapter = useChainAdapters()

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const supportedAdapters = chainAdapter.getSupportedAdapters()
      console.info(supportedAdapters, 'supported adapters')

      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const key = adapter.getType()
        const address = await adapter.getAddress({ wallet })
        await adapter.subscribeTxs(
          { addresses: [address] },
          (msg: chainAdapters.SubscribeTxsMessage<typeof key>) => {
            console.info('onMessage asset history', msg)
            // dispatch(txHistory.actions.onMessage(msg))
          },
          (err: any) => console.info(err)
        )
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, walletInfo?.deviceId])

  return children
}

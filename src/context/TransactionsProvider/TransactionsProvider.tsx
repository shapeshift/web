import { cosmosChainId, fromAccountId, osmosisChainId } from '@keepkey/caip'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import type { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectPortfolioAccountMetadata,
  selectPortfolioLoadingStatus,
} from 'state/slices/selectors'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'
import { validatorDataApi } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { useAppDispatch } from 'state/store'

import { usePlugins } from '../PluginProvider/PluginProvider'

const moduleLogger = logger.child({ namespace: ['TransactionsProvider'] })

type TransactionsProviderProps = {
  children: React.ReactNode
}

export const TransactionsProvider: React.FC<TransactionsProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch()
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const {
    state: { wallet },
  } = useWallet()
  const portfolioAccountMetadata = useSelector(selectPortfolioAccountMetadata)
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const { supportedChains } = usePlugins()

  /**
   * unsubscribe and cleanup logic
   */
  useEffect(() => {
    // we've disconnected/switched a wallet, unsubscribe from tx history and clear tx history
    if (!isSubscribed) return
    moduleLogger.debug({ supportedChains }, 'unsubscribing txs')
    // this is heavy handed but will ensure we're unsubscribed from everything
    supportedChains.forEach(chainId => getChainAdapterManager().get(chainId)?.unsubscribeTxs())
    setIsSubscribed(false)
    // isSubscribed causes spurious unsubscriptions - this will react correctly when portfolioAccountMetadata changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportedChains, wallet, portfolioAccountMetadata])

  /**
   * tx history subscription logic
   */
  useEffect(() => {
    if (isSubscribed) return
    if (!wallet) return
    const accountIds = Object.keys(portfolioAccountMetadata)
    if (!accountIds.length) return
    // this looks useless, but prevents attempting to subscribe multiple times
    // something further up the tree from this provider is causing renders when the portfolio status changes,
    // even though it shouldn't
    if (portfolioLoadingStatus === 'loading') return
    ;(async () => {
      moduleLogger.debug({ accountIds }, 'subscribing txs')
      await Promise.all(
        accountIds.map(async accountId => {
          const accountSpecifier = accountId // backwards compatibility, remove me 🔜
          const { chainId, account } = fromAccountId(accountId)
          const adapter = getChainAdapterManager().get(chainId)

          const accountMetadata = portfolioAccountMetadata[accountId]
          if (!accountMetadata) throw new Error('subscribe txs no accountMetadata?')
          const { accountType, bip44Params } = accountMetadata

          // subscribe to new transactions for all supported accounts
          try {
            return adapter?.subscribeTxs(
              { wallet, accountType, bip44Params },
              msg => {
                const { getAccount } = portfolioApi.endpoints
                const { getValidatorData } = validatorDataApi.endpoints
                const { onMessage } = txHistory.actions

                // refetch validator data on new txs in case TVL or APR has changed
                if ([cosmosChainId, osmosisChainId].includes(msg.chainId))
                  dispatch(getValidatorData.initiate({ accountSpecifier, chainId }))

                const accountSpecifierMap: AccountSpecifierMap = { [msg.chainId]: account }
                // refetch account on new tx
                dispatch(getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true }))
                // deal with incoming message
                dispatch(onMessage({ message: { ...msg, accountType }, accountSpecifier }))
              },
              (err: any) => moduleLogger.error(err),
            )
          } catch (e: unknown) {
            moduleLogger.error(e, { accountId }, 'error subscribing to txs')
          }
        }),
      )

      setIsSubscribed(true)
    })()
  }, [dispatch, isSubscribed, portfolioLoadingStatus, portfolioAccountMetadata, wallet])

  return <>{children}</>
}

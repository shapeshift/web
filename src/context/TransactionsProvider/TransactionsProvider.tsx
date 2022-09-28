import { cosmosChainId, fromAccountId, osmosisChainId } from '@shapeshiftoss/caip'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import isEmpty from 'lodash/isEmpty'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { logger } from 'lib/logger'
import type { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAccountIdByAddress,
  selectAccountSpecifiers,
  selectAssets,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectTxHistoryStatus,
} from 'state/slices/selectors'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'
import { validatorDataApi } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { store, useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['TransactionsProvider'] })

type TransactionsProviderProps = {
  children: React.ReactNode
}

export const TransactionsProvider = ({ children }: TransactionsProviderProps): JSX.Element => {
  const dispatch = useDispatch()
  const {
    state: { wallet, walletInfo },
  } = useWallet()
  const { supportedChains } = usePlugins()
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const assets = useSelector(selectAssets)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const accountSpecifiers = useSelector(selectAccountSpecifiers)
  const portfolioLoadingState = useSelector(selectPortfolioLoadingStatus)
  const txHistoryStatus = useAppSelector(selectTxHistoryStatus)

  const chainAdapterManager = getChainAdapterManager()
  /**
   * unsubscribe and cleanup logic
   */
  useEffect(() => {
    // account specifiers changing will trigger this effect
    // we've disconnected/switched a wallet, unsubscribe from tx history and clear tx history
    if (!isSubscribed) return
    moduleLogger.debug('unsubscribing txs')
    supportedChains.forEach(chainId => chainAdapterManager.get(chainId)?.unsubscribeTxs())
    setIsSubscribed(false)
    // setting isSubscribed to false will trigger this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountSpecifiers, dispatch, chainAdapterManager, supportedChains])

  /**
   * tx history subscription logic
   */
  useEffect(() => {
    if (!wallet) return
    if (isEmpty(assets)) return
    if (portfolioLoadingState === 'loading') return
    if (isSubscribed) return // don't resubscribe
    if (txHistoryStatus !== 'loaded') return
    ;(async () =>
      Promise.all(
        supportedChains
          .filter(chainId => {
            return walletSupportsChain({ chainId, wallet })
          })
          .map(async chainId => {
            const adapter = chainAdapterManager.get(chainId)

            // subscribe to new transactions for all supported accounts
            try {
              // account types are only supported for utxo chains, default to undefined if no accountTypes are supported
              const supportedAccountTypes = adapter?.getSupportedAccountTypes?.() ?? [undefined]

              await Promise.all(
                supportedAccountTypes.map(async accountType => {
                  moduleLogger.debug({ chainId, accountType }, 'subscribing txs')

                  const accountParams = accountType
                    ? utxoAccountParams(chainId, accountType, 0)
                    : {}

                  return adapter?.subscribeTxs(
                    { wallet, accountType, ...accountParams },
                    msg => {
                      const state = store.getState()
                      const accountId = selectAccountIdByAddress(state, {
                        accountSpecifier: `${msg.chainId}:${msg.address}`,
                      })

                      const { getAccount } = portfolioApi.endpoints
                      const { getValidatorData } = validatorDataApi.endpoints

                      // refetch validator data on new txs in case TVL or APR has changed
                      if (msg.chainId === cosmosChainId || msg.chainId === osmosisChainId) {
                        dispatch(
                          getValidatorData.initiate({ accountSpecifier: accountId, chainId }),
                        )
                      }

                      // refetch account on non pending txs
                      // this catches Failed and Unknown status as well in case they caused account changes
                      if (msg.status !== TxStatus.Pending) {
                        const { account } = fromAccountId(accountId)
                        const accountSpecifierMap: AccountSpecifierMap = {
                          [msg.chainId]: account,
                        }
                        dispatch(
                          getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true }),
                        )
                      }

                      dispatch(
                        txHistory.actions.onMessage({
                          message: { ...msg, accountType },
                          accountSpecifier: accountId,
                        }),
                      )
                    },
                    (err: any) => moduleLogger.error(err),
                  )
                }),
              )

              // manage subscription state - we can't request this from chain adapters,
              // and need this to prevent resubscribing when switching wallets
              setIsSubscribed(true)
            } catch (e: unknown) {
              moduleLogger.error(e, { chainId }, 'error subscribing to transactions')
            }
          }),
      ))()
    // assets causes unnecessary renders, but doesn't actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    portfolioLoadingState,
    isSubscribed,
    dispatch,
    walletInfo?.deviceId,
    wallet,
    chainAdapterManager,
    supportedChains,
    accountSpecifiers,
    portfolioAssetIds,
    txHistoryStatus,
  ])

  return <>{children}</>
}

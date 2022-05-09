import { ChainId } from '@shapeshiftoss/caip'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import isEmpty from 'lodash/isEmpty'
import size from 'lodash/size'
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { logger } from 'lib/logger'
import { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { supportedAccountTypes } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { chainIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { cosmosChainId } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountIdByAddress,
  selectAccountSpecifiers,
  selectAssets,
  selectIsPortfolioLoaded,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectTxHistoryStatus,
  selectTxIds,
} from 'state/slices/selectors'
import { txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'
import { SHAPESHIFT_VALIDATOR_ADDRESS } from 'state/slices/validatorDataSlice/const'
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
  const { chainAdapterManager, supportedChains } = usePlugins()
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const assets = useSelector(selectAssets)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const accountSpecifiers = useSelector(selectAccountSpecifiers)
  const isPortfolioLoaded = useSelector(selectIsPortfolioLoaded)
  const txHistoryStatus = useSelector(selectTxHistoryStatus)
  const txIds = useAppSelector(selectTxIds)

  const getAccountSpecifiersByChainId = useCallback(
    (chainId: ChainId): AccountSpecifierMap[] => {
      return accountSpecifiers.reduce<AccountSpecifierMap[]>((acc, cur) => {
        const [_chainId, accountSpecifier] = Object.entries(cur)[0]
        if (_chainId !== chainId) return acc
        return acc.concat({ [chainId]: accountSpecifier })
      }, [])
    },
    [accountSpecifiers],
  )

  /**
   * tx history unsubscribe and cleanup logic
   */
  useEffect(() => {
    // account specifiers changing will trigger this effect
    // we've disconnected/switched a wallet, unsubscribe from tx history and clear tx history
    if (!isSubscribed) return
    moduleLogger.info('unsubscribing from tx history')
    supportedChains.forEach(chain => chainAdapterManager.byChain(chain).unsubscribeTxs())
    dispatch(txHistory.actions.clear())
    setIsSubscribed(false)
    // setting isSubscribed to false will trigger this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountSpecifiers, dispatch, chainAdapterManager, supportedChains])

  const portfolioAccounts = useAppSelector(state => selectPortfolioAccounts(state))

  /**
   * tx history subscription logic
   */
  useEffect(() => {
    if (!wallet) return
    if (isEmpty(assets)) return
    if (!isPortfolioLoaded) return // wait for all chain portfolios to be loaded before subscribing
    if (isSubscribed) return // don't resubscribe
    ;(async () =>
      Promise.all(
        supportedChains
          .filter(chain => {
            const chainId = chainAdapterManager.byChain(chain).getCaip2()
            return walletSupportsChain({ chainId, wallet })
          })
          .map(async chain => {
            const adapter = chainAdapterManager.byChain(chain)
            const chainId = adapter.getCaip2()

            // assets are known to be defined at this point - if we don't have the fee asset we have bigger problems
            const asset = assets[chainIdToFeeAssetId(chainId)]
            const accountTypes = supportedAccountTypes[chain]

            // TODO(0xdef1cafe) - once we have restful tx history for all coinstacks
            // this state machine should be removed, and managed by the txHistory RTK query api
            dispatch(txHistory.actions.setStatus('loading'))
            try {
              await Promise.all(
                accountTypes.map(async accountType => {
                  const accountParams = accountType ? utxoAccountParams(asset, accountType, 0) : {}
                  moduleLogger.info({ chainId, accountType }, 'subscribing txs')
                  return adapter.subscribeTxs(
                    { wallet, accountType, ...accountParams },
                    msg => {
                      const caip10 = `${msg.caip2}:${msg.address}`
                      const state = store.getState()
                      const accountId = selectAccountIdByAddress(state, {
                        accountSpecifier: caip10,
                      })
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
              moduleLogger.error(e, { chain }, 'Error subscribing to transaction history for chain')
            }
            // RESTfully fetch all tx and rebase history for this chain.
            getAccountSpecifiersByChainId(chainId).forEach(accountSpecifierMap => {
              if (accountSpecifierMap[cosmosChainId]) {
                const cosmosAccountSpecifier = accountSpecifierMap[cosmosChainId]
                const cosmosPortfolioAccount =
                  portfolioAccounts[`${cosmosChainId}:${cosmosAccountSpecifier}`]
                if (cosmosPortfolioAccount) {
                  const validatorIds = size(cosmosPortfolioAccount.validatorIds)
                    ? cosmosPortfolioAccount.validatorIds
                    : [SHAPESHIFT_VALIDATOR_ADDRESS]
                  validatorIds?.forEach(validatorAddress => {
                    dispatch(
                      validatorDataApi.endpoints.getValidatorData.initiate({
                        validatorAddress,
                      }),
                    )
                  })
                }
              }
              const { getAllTxHistory, getFoxyRebaseHistoryByAccountId } = txHistoryApi.endpoints
              const options = { forceRefetch: true }
              dispatch(getAllTxHistory.initiate({ accountSpecifierMap }, options))

              /**
               * foxy rebase history is most closely linked to transactions.
               * unfortunately, we have to call this for a specific asset here
               * because we need it for the dashboard balance chart
               *
               * if you're reading this and are about to add another rebase token here,
               * stop, and make a getRebaseHistoryByAccountId that takes
               * an accountId and assetId[] in the txHistoryApi
               */

              // fetch all rebase history for FOXy
              const payload = { accountSpecifierMap, portfolioAssetIds }
              dispatch(getFoxyRebaseHistoryByAccountId.initiate(payload, options))
            })
          }),
      ))()
    // assets causes unnecessary renders, but doesn't actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPortfolioLoaded,
    isSubscribed,
    dispatch,
    walletInfo?.deviceId,
    wallet,
    chainAdapterManager,
    supportedChains,
    accountSpecifiers,
    getAccountSpecifiersByChainId,
    portfolioAssetIds,
  ])

  /**
   * TODO(0xdef1cafe)
   * until all coinstacks (btc and eth) support restful tx pagination
   * we can't know when txs are actually loaded, but we can kind of infer it
   * like we do on the balance charts, by debouncing the txids coming in
   * over the websocket
   *
   * once we connect a wallet and subscribe to tx history, and leave sufficient
   * time (TX_DEBOUNCE_DELAY), we can be pretty sure they're finished loading,
   * and set a loaded flag
   *
   * after this, other parts of the app can useEffect on txids changing,
   * and act on new txs coming in
   */

  useEffect(() => {
    if (isEmpty(assets)) return
    if (!walletInfo?.deviceId) return // we can't be loaded if the wallet isn't connected
    if (txHistoryStatus !== 'loading') return // only start logic below once we know we're loading
    const TX_DEBOUNCE_DELAY = 5000
    const timer = setTimeout(
      () => dispatch(txHistory.actions.setStatus('loaded')),
      TX_DEBOUNCE_DELAY,
    )
    return () => clearTimeout(timer) // clear if the input changes
  }, [assets, dispatch, txHistoryStatus, txIds, walletInfo?.deviceId])

  return <>{children}</>
}

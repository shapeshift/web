import type { AccountId } from '@shapeshiftoss/caip'
import {
  cosmosChainId,
  ethChainId,
  foxAssetId,
  fromAccountId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import React, { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import { fetchAllOpportunitiesUserData } from 'state/slices/opportunitiesSlice/thunks'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectPortfolioAccountMetadata,
  selectPortfolioLoadingStatus,
  selectStakingOpportunitiesById,
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

  const stakingOpportunitiesById = useSelector(selectStakingOpportunitiesById)

  const maybeRefetchOpportunities = useCallback(
    ({ chainId, transfers }: Transaction, accountId: AccountId) => {
      if (
        !(
          chainId === ethChainId &&
          // We don't parse FOX farming Txs with any specific parser, hence we're unable to discriminate by parser type
          // This will refetch opportunities user data on any FOX/ FOX LP token transfer Tx
          // But this is the best we can do at the moment to be reactive
          transfers.some(
            ({ assetId }) =>
              [foxAssetId, foxEthLpAssetId].includes(assetId) ||
              Object.values(stakingOpportunitiesById).some(opportunity =>
                // Detect Txs including a transfer either of either
                // - an asset being wrapped into an Idle token
                // - Idle reward assets being claimed
                // - the Idle AssetId being withdrawn
                Boolean(
                  opportunity?.assetId === assetId ||
                    opportunity?.underlyingAssetId === assetId ||
                    (opportunity?.underlyingAssetIds?.length &&
                      opportunity?.underlyingAssetIds.includes(assetId)) ||
                    (opportunity?.rewardAssetIds?.length &&
                      opportunity?.rewardAssetIds.includes(assetId)),
                ),
              ),
          )
        )
      )
        return
      ;(async () => await fetchAllOpportunitiesUserData(accountId, { forceRefetch: true }))()
    },
    // TODO: This is drunk and will evaluate stakingOpportunitiesById to an empty object despite not being empty when debugged in its outer scope
    // Investigate me, but for now having no deps here is our safest bet
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
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
    ;(() => {
      moduleLogger.debug({ accountIds }, 'subscribing txs')
      accountIds.forEach(accountId => {
        const { chainId } = fromAccountId(accountId)
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
                dispatch(getValidatorData.initiate(accountId))

              // refetch account on new tx
              dispatch(
                getAccount.initiate({ accountId, upsertOnFetch: true }, { forceRefetch: true }),
              )

              maybeRefetchOpportunities(msg, accountId)

              // deal with incoming message
              dispatch(onMessage({ message: { ...msg, accountType }, accountId }))
            },
            (err: any) => moduleLogger.error(err),
          )
        } catch (e: unknown) {
          moduleLogger.error(e, { accountId }, 'error subscribing to txs')
        }
      })

      setIsSubscribed(true)
    })()
  }, [
    dispatch,
    isSubscribed,
    portfolioLoadingStatus,
    portfolioAccountMetadata,
    wallet,
    maybeRefetchOpportunities,
  ])

  return <>{children}</>
}

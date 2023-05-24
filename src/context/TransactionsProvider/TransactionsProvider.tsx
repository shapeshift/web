import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, foxAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { IDLE_PROXY_1_CONTRACT_ADDRESS, IDLE_PROXY_2_CONTRACT_ADDRESS } from 'contracts/constants'
import React, { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { makeNftAssetsFromTxs } from 'state/slices/assetsSlice/utils'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import type { IdleStakingSpecificMetadata } from 'state/slices/opportunitiesSlice/resolvers/idle/types'
import {
  isSupportedThorchainSaversAssetId,
  isSupportedThorchainSaversChainId,
  waitForSaversUpdate,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { fetchAllOpportunitiesUserDataByAccountId } from 'state/slices/opportunitiesSlice/thunks'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectPortfolioAccountMetadata,
  selectPortfolioLoadingStatus,
  selectStakingOpportunitiesById,
} from 'state/slices/selectors'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'
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
    ({ chainId, data, transfers, status }: Transaction, accountId: AccountId) => {
      if (status !== TxStatus.Confirmed) return

      const { getOpportunitiesUserData } = opportunitiesApi.endpoints

      const idleCdoContractAddresses = Object.values(stakingOpportunitiesById)
        .map(opportunity => (opportunity as IdleStakingSpecificMetadata | undefined)?.cdoAddress)
        .filter(isSome)
      const idleContractAddresses = [
        ...idleCdoContractAddresses,
        IDLE_PROXY_1_CONTRACT_ADDRESS,
        IDLE_PROXY_2_CONTRACT_ADDRESS,
      ]
      const shouldRefetchIdleOpportunities = transfers.some(
        ({ from, to }) =>
          idleContractAddresses.includes(from) || idleContractAddresses.includes(to),
      )
      const shouldRefetchCosmosSdkOpportunities = data?.parser === 'staking'
      const shouldRefetchSaversOpportunities =
        isSupportedThorchainSaversChainId(chainId) &&
        transfers.some(({ assetId }) => isSupportedThorchainSaversAssetId(assetId))

      // Ugly catch-all that should go away now that we are fully migrated to the opportunities slice and know the Tx shape of the opportunities we're dealing with
      const shouldRefetchAllOpportunities = !(
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

      if (shouldRefetchIdleOpportunities) {
        dispatch(
          getOpportunitiesUserData.initiate(
            {
              accountId,
              defiProvider: DefiProvider.Idle,
              defiType: DefiType.Staking,
            },
            { forceRefetch: true },
          ),
        )
      } else if (shouldRefetchCosmosSdkOpportunities) {
        dispatch(
          getOpportunitiesUserData.initiate(
            {
              accountId,
              defiProvider: DefiProvider.CosmosSdk,
              defiType: DefiType.Staking,
            },
            { forceRefetch: true },
          ),
        )
      } else if (shouldRefetchSaversOpportunities) {
        // Artificial longer completion time, since THORChain Txs take around 15s after confirmation to be picked in the API
        // This way, we ensure "View Position" actually routes to the updated position
        waitForSaversUpdate().then(() => {
          dispatch(
            getOpportunitiesUserData.initiate(
              {
                accountId,
                defiProvider: DefiProvider.ThorchainSavers,
                defiType: DefiType.Staking,
              },
              { forceRefetch: true },
            ),
          )
        })
      } else if (shouldRefetchAllOpportunities) return
      ;(async () => {
        // We don't know the chainId of the Tx, so we refetch all opportunities
        await fetchAllOpportunitiesUserDataByAccountId(accountId, { forceRefetch: true })
      })()
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
        const { accountNumber } = bip44Params

        // subscribe to new transactions for all supported accounts
        try {
          return adapter?.subscribeTxs(
            { wallet, accountType, accountNumber },
            msg => {
              const { getAccount } = portfolioApi.endpoints
              const { onMessage } = txHistory.actions

              // refetch account on new tx
              dispatch(
                getAccount.initiate({ accountId, upsertOnFetch: true }, { forceRefetch: true }),
              )

              maybeRefetchOpportunities(msg, accountId)

              // upsert any new nft assets if detected
              dispatch(assetsSlice.actions.upsertAssets(makeNftAssetsFromTxs([msg])))

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

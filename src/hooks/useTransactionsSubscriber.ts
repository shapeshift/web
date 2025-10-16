import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, foxAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assets as assetsSlice } from '@/state/slices/assetsSlice/assetsSlice'
import { makeNftAssetsFromTxs } from '@/state/slices/assetsSlice/utils'
import { foxEthLpAssetId } from '@/state/slices/opportunitiesSlice/constants'
import { opportunitiesApi } from '@/state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { opportunities } from '@/state/slices/opportunitiesSlice/opportunitiesSlice'
import { fetchAllOpportunitiesUserDataByAccountId } from '@/state/slices/opportunitiesSlice/thunks'
import { DefiProvider, DefiType } from '@/state/slices/opportunitiesSlice/types'
import { toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import {
  selectPortfolioAccountMetadata,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import { txHistory } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch } from '@/state/store'

export const useTransactionsSubscriber = () => {
  const dispatch = useAppDispatch()
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const {
    state: { isConnected, wallet },
  } = useWallet()
  const portfolioAccountMetadata = useSelector(selectPortfolioAccountMetadata)
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const { supportedChains } = usePlugins()

  const stakingOpportunitiesById = useSelector(
    opportunities.selectors.selectStakingOpportunitiesById,
  )

  const maybeRefetchOpportunities = useCallback(
    ({ chainId, data, transfers, status }: Transaction, accountId: AccountId) => {
      if (status !== TxStatus.Confirmed) return

      const { getOpportunitiesUserData, getOpportunityUserData } = opportunitiesApi.endpoints

      const shouldRefetchRfoxOpportunity = data?.parser === 'rfox' && data.type === 'evm'
      const shouldRefetchCosmosSdkOpportunities = data?.parser === 'staking'

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
              // - an asset being wrapped into a token
              // - reward assets being claimed
              // - the underlying asset being withdrawn
              Boolean(
                opportunity?.assetId === assetId ||
                  opportunity?.underlyingAssetId === assetId ||
                  (opportunity?.underlyingAssetIds !== undefined && opportunity?.underlyingAssetIds.length > 0 &&
                    opportunity?.underlyingAssetIds.includes(assetId)) ||
                  (opportunity?.rewardAssetIds !== undefined && opportunity?.rewardAssetIds.length > 0 &&
                    opportunity?.rewardAssetIds.includes(assetId)),
              ),
            ),
        )
      )

      if (shouldRefetchRfoxOpportunity) {
        dispatch(
          getOpportunityUserData.initiate(
            [
              {
                opportunityId: toOpportunityId({
                  assetNamespace: fromAssetId(data.assetId).assetNamespace,
                  chainId,
                  assetReference: fromAssetId(data.assetId).assetReference,
                }),
                accountId,
                defiProvider: DefiProvider.rFOX,
                defiType: DefiType.Staking,
              },
            ],
            { forceRefetch: true },
          ),
        )
      } else if (shouldRefetchCosmosSdkOpportunities) {
        dispatch(
          getOpportunitiesUserData.initiate(
            [
              {
                accountId,
                defiProvider: DefiProvider.CosmosSdk,
                defiType: DefiType.Staking,
              },
            ],
            { forceRefetch: true },
          ),
        )
      } else if (shouldRefetchAllOpportunities) return
      ;(async () => {
        // We don't know the chainId of the Tx, so we refetch all opportunities
        await fetchAllOpportunitiesUserDataByAccountId(dispatch, accountId, { forceRefetch: true })
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
    // we've disconnected/switched a wallet, unsubscribe transactions
    if (!isSubscribed) return
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
    if (!wallet || !isConnected) return

    const accountIds = Object.keys(portfolioAccountMetadata)
    if (!accountIds.length) return

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
          {
            wallet,
            accountType,
            accountNumber,
            pubKey: isLedger(wallet) && accountId ? fromAccountId(accountId).account : undefined,
          },
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
          err => console.error(err),
        )
      } catch (e) {
        console.error(e)
      }
    })

    setIsSubscribed(true)
  }, [
    dispatch,
    isConnected,
    isSubscribed,
    maybeRefetchOpportunities,
    portfolioAccountMetadata,
    portfolioLoadingStatus,
    wallet,
  ])
}

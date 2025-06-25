import { usePrevious } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { deriveAccountIdsAndMetadata } from '@/lib/account/account'
import { isUtxoChainId } from '@/lib/utils/utxo'
import {
  portfolio,
  portfolio as portfolioSlice,
  portfolioApi,
} from '@/state/slices/portfolioSlice/portfolioSlice'
import type { Portfolio } from '@/state/slices/portfolioSlice/portfolioSliceCommon'
import { selectPortfolioAccounts } from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const { getAccount } = portfolioApi.endpoints

export const useAccountsFetchQuery = () => {
  const dispatch = useAppDispatch()
  const { supportedChains } = usePlugins()
  const { isSnapInstalled } = useIsSnapInstalled()
  const previousIsSnapInstalled = usePrevious(isSnapInstalled)
  const { deviceId, wallet } = useWallet().state
  const enabledPortfolioAccounts = useAppSelector(selectPortfolioAccounts)
  const portfolioAccounts = useAppSelector(portfolio.selectors.selectAccountsById)
  const queryClient = useQueryClient()

  // It feels a bit weird but, if isSnapInstalled is null it means that it's been going through the useIsSnapInstalled hook
  // If it's undefined, it didn't check anything yet and we absolutely don't want to react on that as it would react even with other type of accounts
  // And we need to check for the null case because if you come from another wallet than metamask, it is null initially
  const isSnapStatusUpdated = useMemo(() => {
    if (previousIsSnapInstalled === null && isSnapInstalled === true) return true
    if (previousIsSnapInstalled === null && isSnapInstalled === false) return true
    if (previousIsSnapInstalled === false && isSnapInstalled === true) return true
    if (previousIsSnapInstalled === true && isSnapInstalled === false) return true

    return false
  }, [isSnapInstalled, previousIsSnapInstalled])

  useEffect(() => {
    // If the user install the MM snap or uninstall it, we need to invalidate the query and refetch accounts
    // specially handling the case were the user already had a version with or without the snap in cache
    // This will enable or disable accounts supported by the snap
    if (isSnapStatusUpdated) {
      queryClient.invalidateQueries({
        queryKey: ['useAccountsFetch'],
        exact: false,
      })
    }
  }, [isSnapInstalled, previousIsSnapInstalled, queryClient, isSnapStatusUpdated])

  const queryFn = useCallback(async () => {
    let chainIds = new Set(
      supportedChains.filter(chainId =>
        walletSupportsChain({
          chainId,
          wallet,
          isSnapInstalled,
          checkConnectedAccountIds: false, // don't check connected account ids, we're detecting runtime support for chains
        }),
      ),
    )

    if (!chainIds.size) return null
    if (!wallet || isLedger(wallet)) return null

    const walletId = await wallet.getDeviceID()
    const isMultiAccountWallet = wallet.supportsBip44Accounts()
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet
    const currentPortfolio = portfolioSlice.selectors.selectPortfolio(store.getState())

    const accountMetadataByAccountId: AccountMetadataById = {}
    for (let accountNumber = 0; chainIds.size > 0; accountNumber++) {
      if (accountNumber > 0) {
        // only some wallets support multi account
        if (!isMultiAccountWallet) break

        // MM without snaps does not support non-EVM chains, hence no multi-account
        // since EVM chains in MM use MetaMask's native JSON-RPC functionality which doesn't support multi-account
        if (isMetaMaskMultichainWallet && !isSnapInstalled) break
      }

      const accountIdsAndMetadata = await deriveAccountIdsAndMetadata({
        accountNumber,
        chainIds: Array.from(chainIds),
        wallet,
        isSnapInstalled: Boolean(isSnapInstalled),
      })

      Object.assign(accountMetadataByAccountId, accountIdsAndMetadata)

      const accountIdsByChainId = Object.keys(accountIdsAndMetadata).reduce(
        (acc, accountId) => {
          const { chainId } = fromAccountId(accountId)

          if (!acc[chainId]) acc[chainId] = []
          acc[chainId].push(accountId)

          return acc
        },
        {} as Record<ChainId, AccountId[]>,
      )

      const chainIdsWithActivity = new Set<ChainId>()
      const accountPromises = Object.values(accountIdsByChainId).map(async accountIds => {
        const portfolioResults = await Promise.allSettled(
          accountIds.map(async accountId => {
            // If account exists in store and had activity, skip fetching
            if (enabledPortfolioAccounts[accountId]?.hasActivity && !isSnapStatusUpdated)
              return currentPortfolio

            // If not in store, fetch it
            const { data } = await dispatch(getAccount.initiate({ accountId, upsertOnFetch: true }))

            return data
          }),
        )

        const portfolios = portfolioResults
          .filter(
            (result): result is PromiseFulfilledResult<Portfolio> =>
              result.status === 'fulfilled' && Boolean(result.value),
          )
          .map(result => result.value)

        portfolios.forEach((portfolio, i) => {
          const accountId = accountIds[i]
          const accountChainId = fromAccountId(accountId).chainId

          const hasChainActivity = (() => {
            if (!isUtxoChainId(accountChainId)) {
              return portfolio.accounts.byId[accountId].hasActivity
            }

            // For UTXO AccountIds, we need to check if *any* of the scriptTypes have activity, not only the current one
            // else, we might end up with partial account data, with only the first 1 or 2 out of 3 scriptTypes being upserted
            return portfolios.some((portfolio, i) => {
              const accountId = accountIds[i]
              if (fromAccountId(accountId).chainId !== accountChainId) return false
              return portfolio.accounts.byId[accountId].hasActivity
            })
          })()

          // don't add accounts with no activity past account 0
          if (accountNumber > 0 && !hasChainActivity) {
            chainIdsWithActivity.delete(accountChainId)
            delete accountMetadataByAccountId[accountId]
          } else {
            chainIdsWithActivity.add(accountChainId)

            // Only dispatch updates for newly fetched accounts which didn't have activity or didn't exist yet in the store
            if (
              (!enabledPortfolioAccounts[accountId]?.hasActivity &&
                !portfolioAccounts[accountId]) ||
              isSnapStatusUpdated
            ) {
              dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))

              accountIds.forEach(accountId => {
                dispatch(portfolioSlice.actions.enableAccountId(accountId))
              })

              const _accountMetadataByAccountId = Object.fromEntries(
                Object.entries(accountMetadataByAccountId).filter(([accountId]) =>
                  accountIds.includes(accountId),
                ),
              )

              dispatch(
                portfolioSlice.actions.upsertAccountMetadata({
                  accountMetadataByAccountId: _accountMetadataByAccountId,
                  walletId,
                }),
              )
            }
          }
        })
      })

      await Promise.allSettled(accountPromises)
      chainIds = chainIdsWithActivity
    }

    return null
  }, [
    dispatch,
    isSnapInstalled,
    supportedChains,
    wallet,
    enabledPortfolioAccounts,
    portfolioAccounts,
    isSnapStatusUpdated,
  ])

  const query = useQuery({
    queryKey: [
      'useAccountsFetch',
      {
        deviceId,
        supportedChains,
        isSnapStatusUpdated,
      },
    ],
    queryFn: wallet && deviceId ? queryFn : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return query
}

import { isGridPlus } from '@shapeshiftoss/hdwallet-gridplus'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getAccountIdsWithActivityAndMetadata } from '@/components/Modals/ManageAccounts/helpers'
import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { METAMASK_RDNS } from '@/lib/mipd'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useDiscoverAccounts = () => {
  const dispatch = useAppDispatch()
  const { isSnapInstalled } = useIsSnapInstalled()
  const { deviceId, wallet } = useWallet().state
  const { supportedChains } = usePlugins()
  const connectedRdns = useAppSelector(selectWalletRdns)

  const shouldSkipAutoDiscovery = useMemo(() => {
    return wallet && (isLedger(wallet) || isGridPlus(wallet))
  }, [wallet])

  const supportedChainIds = useMemo(() => {
    return supportedChains.filter(chainId =>
      walletSupportsChain({ chainId, wallet, isSnapInstalled, checkConnectedAccountIds: false }),
    )
  }, [supportedChains, wallet, isSnapInstalled])

  const queries = useMemo(
    () =>
      supportedChainIds.map(chainId => ({
        queryKey: [
          'useDiscoverAccounts',
          {
            deviceId,
            isSnapInstalled,
          },
          chainId,
        ],
        queryFn: async () => {
          const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet

          if (
            !wallet ||
            shouldSkipAutoDiscovery ||
            // Before connecting to MetaMask, isSnapInstalled is null then switch to false when the hook reacts, we would run the discovery 2 times
            (connectedRdns === METAMASK_RDNS && isSnapInstalled === null)
          ) {
            return { accountMetadataByAccountId: {}, hasActivity: false }
          }

          const connectedWalletId = portfolio.selectors.selectWalletId(store.getState())
          const walletId = connectedWalletId ?? (await wallet.getDeviceID())
          const isMultiAccountWallet = wallet.supportsBip44Accounts()
          const currentPortfolio = portfolio.selectors.selectPortfolio(store.getState())

          let accountNumber = 0
          let hasActivity = true
          let isDegraded = false
          const chainAccountMetadata: AccountMetadataById = {}

          while (hasActivity) {
            if (accountNumber > 0) {
              if (!isMultiAccountWallet) break
              if (isMetaMaskMultichainWallet && !isSnapInstalled) break
            }

            try {
              const accountIdWithActivityAndMetadata = await getAccountIdsWithActivityAndMetadata(
                accountNumber,
                chainId,
                wallet,
                Boolean(isSnapInstalled),
              )

              hasActivity = accountIdWithActivityAndMetadata.some(account => account.hasActivity)

              if (hasActivity || accountNumber === 0) {
                accountIdWithActivityAndMetadata.forEach(({ accountId, accountMetadata }) => {
                  chainAccountMetadata[accountId] = accountMetadata
                })
              }

              accountNumber++
            } catch (error) {
              console.error(`Error discovering accounts for chain ${chainId}:`, error)
              isDegraded = true
              break
            }
          }

          if (Object.keys(chainAccountMetadata).length > 0) {
            dispatch(
              portfolio.actions.upsertAccountMetadata({
                accountMetadataByAccountId: chainAccountMetadata,
                walletId,
              }),
            )

            Object.keys(chainAccountMetadata).forEach(accountId => {
              // Don't enable accounts that are already in the portfolio so we keep it disabled if user manually disabled it
              if (
                currentPortfolio.accountMetadata.byId[accountId] &&
                currentPortfolio.wallet.byId[walletId]?.includes(accountId)
              )
                return

              dispatch(portfolio.actions.enableAccountId(accountId))
            })
          }

          return {
            accountMetadataByAccountId: chainAccountMetadata,
            hasActivity,
            isDegraded,
            chainId,
          }
        },
        staleTime: Infinity,
        gcTime: Infinity,
        enabled: Boolean(wallet && deviceId),
      })),
    [
      dispatch,
      isSnapInstalled,
      wallet,
      deviceId,
      supportedChainIds,
      connectedRdns,
      shouldSkipAutoDiscovery,
    ],
  )

  const accountsDiscoveryQueries = useQueries({
    queries,
  })

  const { isLoading, isFetching } = useMemo(() => {
    return {
      isLoading: accountsDiscoveryQueries.some(query => query.isLoading),
      isFetching: accountsDiscoveryQueries.some(query => query.isFetching),
    }
  }, [accountsDiscoveryQueries])

  const degradedChainIds = useMemo(() => {
    return accountsDiscoveryQueries
      .filter(query => query.data?.isDegraded)
      .map(query => {
        return query.data?.chainId
      })
  }, [accountsDiscoveryQueries])

  return {
    isLoading,
    isFetching,
    degradedChainIds,
  }
}

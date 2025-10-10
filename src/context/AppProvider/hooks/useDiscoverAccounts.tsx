import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getAccountIdsWithActivityAndMetadata } from '@/components/ManageAccountsDrawer/helpers'
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
          console.log(`[AccountDiscovery] 🔍 Starting discovery for chainId: ${chainId}`)
          const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet

          if (
            !wallet ||
            isLedger(wallet) ||
            // Before connecting to MetaMask, isSnapInstalled is null then switch to false when the hook reacts, we would run the discovery 2 times
            (connectedRdns === METAMASK_RDNS && isSnapInstalled === null)
          ) {
            console.log(`[AccountDiscovery] ⏭️  Skipping chainId ${chainId} - wallet check failed`)
            return { accountMetadataByAccountId: {}, hasActivity: false }
          }

          const connectedWalletId = portfolio.selectors.selectWalletId(store.getState())
          const walletId = connectedWalletId ?? (await wallet.getDeviceID())
          console.log(
            `[AccountDiscovery] 💼 WalletId: ${walletId} (connectedWalletId: ${connectedWalletId}, deviceId: ${await wallet.getDeviceID()})`,
          )
          const isMultiAccountWallet = wallet.supportsBip44Accounts()
          console.log(`[AccountDiscovery] 🔢 Multi-account wallet: ${isMultiAccountWallet}`)
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

            console.log(
              `[AccountDiscovery] 🔄 Deriving account #${accountNumber} for chainId ${chainId}`,
            )
            try {
              const accountIdWithActivityAndMetadata = await getAccountIdsWithActivityAndMetadata(
                accountNumber,
                chainId,
                wallet,
                Boolean(isSnapInstalled),
              )

              console.log(
                `[AccountDiscovery] 📊 Account #${accountNumber} results:`,
                accountIdWithActivityAndMetadata.map(a => ({
                  accountId: a.accountId,
                  hasActivity: a.hasActivity,
                })),
              )

              hasActivity = accountIdWithActivityAndMetadata.some(account => account.hasActivity)
              console.log(
                `[AccountDiscovery] ${
                  hasActivity ? '✅' : '⏹️'
                } Has activity for account #${accountNumber}: ${hasActivity}`,
              )

              if (hasActivity || accountNumber === 0) {
                accountIdWithActivityAndMetadata.forEach(({ accountId, accountMetadata }) => {
                  console.log(`[AccountDiscovery] 💾 Caching metadata for ${accountId}`)
                  chainAccountMetadata[accountId] = accountMetadata
                })
              }

              accountNumber++
            } catch (error) {
              console.error(
                `[AccountDiscovery] ❌ Error discovering accounts for chain ${chainId}:`,
                error,
              )
              isDegraded = true
              break
            }
          }

          console.log(
            `[AccountDiscovery] 📦 Total accounts cached for chainId ${chainId}:`,
            Object.keys(chainAccountMetadata).length,
          )

          if (Object.keys(chainAccountMetadata).length > 0) {
            console.log(
              `[AccountDiscovery] 💾 Upserting account metadata for walletId: ${walletId}`,
            )
            dispatch(
              portfolio.actions.upsertAccountMetadata({
                accountMetadataByAccountId: chainAccountMetadata,
                walletId,
              }),
            )

            Object.keys(chainAccountMetadata).forEach(accountId => {
              const alreadyInPortfolio =
                currentPortfolio.accountMetadata.byId[accountId] &&
                currentPortfolio.wallet.byId[walletId]?.includes(accountId)

              if (alreadyInPortfolio) {
                console.log(
                  `[AccountDiscovery] ⏭️  Skipping enable for ${accountId} (already in portfolio)`,
                )
                return
              }

              console.log(`[AccountDiscovery] ✅ Enabling accountId: ${accountId}`)
              dispatch(portfolio.actions.enableAccountId(accountId))
            })
          }

          console.log(`[AccountDiscovery] ✅ Discovery complete for chainId ${chainId}`)
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
    [dispatch, isSnapInstalled, wallet, deviceId, supportedChainIds, connectedRdns],
  )

  const accountsDiscoveryQueries = useQueries({
    queries,
  })

  const { isLoading, isFetching } = useMemo(() => {
    const loading = accountsDiscoveryQueries.some(query => query.isLoading)
    const fetching = accountsDiscoveryQueries.some(query => query.isFetching)
    console.log(`[AccountDiscovery] 📡 Status: isLoading=${loading}, isFetching=${fetching}`)
    return {
      isLoading: loading,
      isFetching: fetching,
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

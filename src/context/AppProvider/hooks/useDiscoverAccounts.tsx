import type { ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

import { getAccountIdsWithActivityAndMetadata } from '@/components/ManageAccountsDrawer/helpers'
import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useDiscoverAccounts = () => {
  const dispatch = useAppDispatch()
  const { supportedChains } = usePlugins()
  const { isSnapInstalled } = useIsSnapInstalled()
  const { deviceId, wallet } = useWallet().state
  const enabledAccountIds = useAppSelector(selectEnabledWalletAccountIds)

  const discoverAccounts = useCallback(async () => {
    let chainIds = new Set(
      supportedChains.filter(chainId =>
        walletSupportsChain({ chainId, wallet, isSnapInstalled, checkConnectedAccountIds: false }),
      ),
    )
    const currentPortfolio = portfolio.selectors.selectPortfolio(store.getState())

    if (enabledAccountIds.length > 0) {
      return {
        accountMetadataByAccountId: currentPortfolio.accountMetadata.byId,
        chainIdsWithActivity: currentPortfolio.accountMetadata.ids.map(
          id => fromAccountId(id).chainId,
        ),
      }
    }

    if (!chainIds.size) return { accountMetadataByAccountId: {}, chainIdsWithActivity: new Set() }
    if (!wallet || isLedger(wallet))
      return { accountMetadataByAccountId: {}, chainIdsWithActivity: new Set() }

    const walletId = await wallet.getDeviceID()
    const isMultiAccountWallet = wallet.supportsBip44Accounts()
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet

    const accountMetadataByAccountId: AccountMetadataById = {}
    const chainIdsWithActivity = new Set<ChainId>()

    // Helper function to discover accounts for a single chain
    const discoverChainAccounts = async (chainId: ChainId) => {
      let accountNumber = 0
      let hasActivity = true
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

          if (hasActivity) {
            accountIdWithActivityAndMetadata.forEach(({ accountId, accountMetadata }) => {
              chainAccountMetadata[accountId] = accountMetadata
            })
          }

          accountNumber++
        } catch (error) {
          console.error(`Error discovering accounts for chain ${chainId}:`, error)
          break
        }
      }

      return { chainId, chainAccountMetadata }
    }

    const chainDiscoveryPromises = Array.from(chainIds).map(chainId =>
      discoverChainAccounts(chainId),
    )

    const results = await Promise.allSettled(chainDiscoveryPromises)

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { chainId, chainAccountMetadata } = result.value

        if (Object.keys(chainAccountMetadata).length > 0) {
          Object.assign(accountMetadataByAccountId, chainAccountMetadata)
          chainIdsWithActivity.add(chainId)

          dispatch(
            portfolio.actions.upsertAccountMetadata({
              accountMetadataByAccountId: chainAccountMetadata,
              walletId,
            }),
          )

          Object.keys(chainAccountMetadata).forEach(accountId => {
            dispatch(portfolio.actions.enableAccountId(accountId))
          })
        }
      } else {
        console.error('Chain discovery failed:', result.reason)
      }
    })

    return { accountMetadataByAccountId, chainIdsWithActivity }
  }, [dispatch, isSnapInstalled, wallet, supportedChains, enabledAccountIds])

  const query = useQuery({
    queryKey: [
      'useDiscoverAccounts',
      {
        deviceId,
        isSnapInstalled,
      },
    ],
    queryFn: wallet && deviceId ? discoverAccounts : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return query
}

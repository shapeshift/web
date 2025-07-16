import { usePrevious } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'

import { getAccountIdsWithActivityAndMetadata } from '@/components/ManageAccountsDrawer/helpers'
import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectWalletId } from '@/state/slices/common-selectors'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useDiscoverAccounts = () => {
  const dispatch = useAppDispatch()
  const { supportedChains } = usePlugins()
  const { isSnapInstalled } = useIsSnapInstalled()
  const previousIsSnapInstalled = usePrevious(isSnapInstalled)
  const { deviceId, wallet } = useWallet().state
  const currentWalletId = useAppSelector(selectWalletId)
  const queryClient = useQueryClient()

  const isSnapStatusUpdated = useMemo(() => {
    if (previousIsSnapInstalled === null && isSnapInstalled === true) return true
    if (previousIsSnapInstalled === null && isSnapInstalled === false) return true
    if (previousIsSnapInstalled === false && isSnapInstalled === true) return true
    if (previousIsSnapInstalled === true && isSnapInstalled === false) return true
    return false
  }, [isSnapInstalled, previousIsSnapInstalled])

  useEffect(() => {
    if (!currentWalletId) return

    if (previousIsSnapInstalled === true && isSnapInstalled === false) {
      dispatch(portfolio.actions.clearWalletMetadata(currentWalletId))
      console.log('clearWalletMetadata')
      queryClient.invalidateQueries({
        queryKey: ['useDiscoverAccounts'],
        exact: false,
      })
    }

    if (previousIsSnapInstalled === false && isSnapInstalled === true) {
      queryClient.invalidateQueries({
        queryKey: ['useDiscoverAccounts'],
        exact: false,
      })
    }
  }, [currentWalletId, dispatch, previousIsSnapInstalled, isSnapInstalled, queryClient])

  const discoverAccounts = useCallback(async () => {
    let chainIds = new Set(
      supportedChains.filter(chainId =>
        walletSupportsChain({
          chainId,
          wallet,
          isSnapInstalled,
          checkConnectedAccountIds: false,
        }),
      ),
    )

    if (!chainIds.size) return { accountMetadataByAccountId: {}, chainIdsWithActivity: new Set() }
    if (!wallet || isLedger(wallet))
      return { accountMetadataByAccountId: {}, chainIdsWithActivity: new Set() }

    const walletId = await wallet.getDeviceID()
    const isMultiAccountWallet = wallet.supportsBip44Accounts()
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet

    const accountMetadataByAccountId: AccountMetadataById = {}
    const chainIdsWithActivity = new Set<ChainId>()

    console.log({
      chainIds,
      isSnapInstalled,
    })

    // Discover accounts for each chain with activity-based stopping
    for (const chainId of chainIds) {
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

          // Check if any account has activity
          hasActivity = accountIdWithActivityAndMetadata.some(account => account.hasActivity)

          if (hasActivity) {
            accountIdWithActivityAndMetadata.forEach(({ accountId, accountMetadata }) => {
              chainAccountMetadata[accountId] = accountMetadata
            })

            chainIdsWithActivity.add(chainId)
          }

          accountNumber++
        } catch (error) {
          console.error(`Error discovering accounts for chain ${chainId}:`, error)
          break
        }
      }

      if (Object.keys(chainAccountMetadata).length > 0) {
        Object.assign(accountMetadataByAccountId, chainAccountMetadata)

        dispatch(
          portfolio.actions.upsertAccountMetadata({
            accountMetadataByAccountId: chainAccountMetadata,
            walletId,
          }),
        )

        console.log({
          chainAccountMetadata,
        })

        Object.keys(chainAccountMetadata).forEach(accountId => {
          dispatch(portfolio.actions.enableAccountId(accountId))
        })
      }
    }

    console.log({
      chainIdsWithActivity,
      accountMetadataByAccountId,
    })

    return { accountMetadataByAccountId, chainIdsWithActivity }
  }, [dispatch, isSnapInstalled, supportedChains, wallet])

  const query = useQuery({
    queryKey: [
      'useDiscoverAccounts',
      {
        deviceId,
        supportedChains,
        isSnapInstalled,
        isSnapStatusUpdated,
      },
    ],
    queryFn: wallet && deviceId ? discoverAccounts : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return query
}

import { usePrevious } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { isUtxoChainId } from 'lib/utils/utxo'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectEnabledWalletAccountIds } from 'state/slices/selectors'
import { txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useAccountsFetchQuery = () => {
  const dispatch = useAppDispatch()
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const { supportedChains } = usePlugins()
  const { isSnapInstalled } = useIsSnapInstalled()
  const previousIsSnapInstalled = usePrevious(isSnapInstalled)
  const { deviceId, wallet } = useWallet().state

  const hasManagedAccounts = useMemo(() => {
    // MM without snap doesn't allow account management - if the user just installed the snap, we know they don't have managed accounts
    if (!previousIsSnapInstalled && isSnapInstalled) return false
    // We know snap wasn't just installed in this render - so if there are any requestedAccountIds, we assume the user has managed accounts
    return enabledWalletAccountIds.length > 0
  }, [isSnapInstalled, previousIsSnapInstalled, enabledWalletAccountIds.length])

  const queryFn = useCallback(async () => {
    let chainIds = new Set(
      supportedChains.filter(chainId => {
        return walletSupportsChain({
          chainId,
          wallet,
          isSnapInstalled,
          checkConnectedAccountIds: false, // don't check connected account ids, we're detecting runtime support for chains
        })
      }),
    )
    if (!chainIds.size) return

    if (!wallet || isLedger(wallet)) return

    const walletId = await wallet.getDeviceID()

    const accountMetadataByAccountId: AccountMetadataById = {}
    const isMultiAccountWallet = wallet.supportsBip44Accounts()
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
    for (let accountNumber = 0; chainIds.size > 0; accountNumber++) {
      if (
        accountNumber > 0 &&
        // only some wallets support multi account
        (!isMultiAccountWallet ||
          // MM without snaps does not support non-EVM chains, hence no multi-account
          // since EVM chains in MM use MetaMask's native JSON-RPC functionality which doesn't support multi-account
          (isMetaMaskMultichainWallet && !isSnapInstalled))
      )
        break

      const input = {
        accountNumber,
        chainIds: Array.from(chainIds),
        wallet,
        isSnapInstalled: Boolean(isSnapInstalled),
      }
      const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)
      const accountIds = Object.keys(accountIdsAndMetadata)

      Object.assign(accountMetadataByAccountId, accountIdsAndMetadata)

      const { getAccount } = portfolioApi.endpoints

      const accountNumberAccountIdsByChainId = (
        _accountIds: AccountId[],
      ): Record<ChainId, AccountId[]> => {
        return _accountIds.reduce(
          (acc, _accountId) => {
            const { chainId } = fromAccountId(_accountId)

            if (!acc[chainId]) {
              acc[chainId] = []
            }
            acc[chainId].push(_accountId)

            return acc
          },
          {} as Record<ChainId, AccountId[]>,
        )
      }

      let chainIdsWithActivity: Set<ChainId> = new Set()
      // This allows every run of AccountIds per chain/accountNumber to run in parallel vs. all sequentally, so
      // we can run each item (usually one AccountId, except UTXOs which may contain many because of many scriptTypes) 's side effects immediately
      const accountNumberAccountIdsPromises = Object.values(
        accountNumberAccountIdsByChainId(accountIds),
      ).map(async accountIds => {
        const results = await Promise.allSettled(
          accountIds.map(async id => {
            const result = await dispatch(
              getAccount.initiate({ accountId: id, upsertOnFetch: true }),
            )
            return result
          }),
        )

        results.forEach((res, idx) => {
          if (res.status === 'rejected') return

          const { data: account } = res.value
          if (!account) return

          const accountId = accountIds[idx]
          const { chainId } = fromAccountId(accountId)

          const { hasActivity } = account.accounts.byId[accountId]

          const accountNumberHasChainActivity = !isUtxoChainId(chainId)
            ? hasActivity
            : // For UTXO AccountIds, we need to check if *any* of the scriptTypes have activity, not only the current one
              // else, we might end up with partial account data, with only the first 1 or 2 out of 3 scriptTypes
              // being upserted for BTC and LTC
              results.some((res, _idx) => {
                if (res.status === 'rejected') return false
                const { data: account } = res.value
                if (!account) return false
                const accountId = accountIds[_idx]
                const { chainId: _chainId } = fromAccountId(accountId)
                if (chainId !== _chainId) return false
                return account.accounts.byId[accountId].hasActivity
              })

          // don't add accounts with no activity past account 0
          if (accountNumber > 0 && !accountNumberHasChainActivity) {
            chainIdsWithActivity.delete(chainId)
            delete accountMetadataByAccountId[accountId]
          } else {
            // handle utxo chains with multiple account types per account
            chainIdsWithActivity.add(chainId)

            dispatch(portfolio.actions.upsertPortfolio(account))
            const chainIdAccountMetadata = Object.entries(accountMetadataByAccountId).reduce(
              (acc, [accountId, metadata]) => {
                const { chainId: _chainId } = fromAccountId(accountId)
                if (chainId === _chainId) {
                  acc[accountId] = metadata
                }
                return acc
              },
              {} as AccountMetadataById,
            )
            for (const accountId of Object.keys(chainIdAccountMetadata)) {
              dispatch(portfolio.actions.enableAccountId(accountId))
            }
            dispatch(
              portfolio.actions.upsertAccountMetadata({
                accountMetadataByAccountId: chainIdAccountMetadata,
                walletId,
              }),
            )
          }
        })

        return results
      })

      await Promise.allSettled(accountNumberAccountIdsPromises)
      chainIds = chainIdsWithActivity
    }

    // Only fetch and upsert Tx history once all are loaded, otherwise big main thread rug
    const { getAllTxHistory } = txHistoryApi.endpoints

    await Promise.all(
      enabledWalletAccountIds.map(requestedAccountId =>
        dispatch(getAllTxHistory.initiate(requestedAccountId)),
      ),
    )
  }, [dispatch, enabledWalletAccountIds, isSnapInstalled, supportedChains, wallet])

  const query = useQuery({
    queryKey: [
      'useAccountsFetch',
      {
        deviceId,
        supportedChains,
      },
    ],
    queryFn: deviceId && !hasManagedAccounts ? queryFn : skipToken,
  })

  // Fetch portfolio for all managed accounts as a side-effect if they exist instead of going through the initial account detection flow.
  // This ensures that we have fresh portfolio data, but accounts added through account management are not accidentally blown away.
  useEffect(() => {
    // Initial accounts fetch query is loading - we know we're not in the context of managed accounts just yet
    if (query.isLoading || query.isFetching) return
    if (!hasManagedAccounts) return

    enabledWalletAccountIds.forEach(accountId => {
      dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    })
  }, [dispatch, enabledWalletAccountIds, hasManagedAccounts, query.isFetching, query.isLoading])

  return query
}

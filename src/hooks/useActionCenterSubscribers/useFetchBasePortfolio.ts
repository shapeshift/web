import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, baseChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import { useCallback } from 'react'
import { erc20Abi, getAddress } from 'viem'

import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { portfolio, portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

// TEMP HACK FOR BASE
export const useBasePortfolioManagement = () => {
  const dispatch = useAppDispatch()

  const accountsById = useAppSelector(portfolio.selectors.selectAccountsById)
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)

  const fetchBasePortfolio = useCallback(() => {
    enabledWalletAccountIds.forEach(accountId => {
      if (fromAccountId(accountId).chainId !== baseChainId) return

      dispatch(
        portfolioApi.endpoints.getAccount.initiate(
          { accountId, upsertOnFetch: true },
          { forceRefetch: true },
        ),
      )
    })
  }, [enabledWalletAccountIds, dispatch])

  const upsertBasePortfolio = useCallback(
    async ({ accountId, assetId }: { accountId?: AccountId; assetId: AssetId }) => {
      if (!accountId) return
      if (!accountsById[accountId]) return

      const { account } = fromAccountId(accountId)
      const { chainId, assetNamespace, assetReference } = fromAssetId(assetId)

      if (chainId !== baseChainId) return
      if (assetNamespace !== ASSET_NAMESPACE.erc20) return

      const client = viemClientByChainId[chainId]

      const balance = await client.readContract({
        address: getAddress(assetReference),
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [getAddress(account)],
      })

      dispatch(
        portfolio.actions.upsertPortfolio({
          accounts: { byId: {}, ids: [] },
          accountBalances: { byId: { [accountId]: { [assetId]: balance.toString() } }, ids: [] },
        }),
      )
    },
    [accountsById, dispatch],
  )

  return { fetchBasePortfolio, upsertBasePortfolio }
}

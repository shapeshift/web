import { ethChainId, foxAssetId, fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { useGetFoxyAprQuery, useGetFoxyBalancesQuery } from 'state/apis/foxy/foxyApi'
import {
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountsGroupedByNumberByChainId,
} from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

export function useFoxyBalances({ accountNumber }: { accountNumber?: number } = {}) {
  const {
    state: { wallet },
  } = useWallet()

  const accountsByNumber = useAppSelector(state =>
    selectPortfolioAccountsGroupedByNumberByChainId(state, { chainId: ethChainId }),
  )

  const userAddress = useMemo(() => {
    if (accountNumber === undefined) return null
    const accountId = accountsByNumber[accountNumber]?.[0] // Only one address per account for EVM chains i.e no multiple accountTypes
    return accountId ? fromAccountId(accountId).account : null
  }, [accountNumber, accountsByNumber])

  const { data: foxyAprData } = useGetFoxyAprQuery()

  const supportsEthereumChain = useWalletSupportsChain({ chainId: ethChainId, wallet })

  // If an account number is specified, find the accountId for it
  const maybeAccountIdFilter = useMemo(
    () =>
      userAddress?.length
        ? toAccountId({
            chainId: ethChainId,
            account: userAddress!,
          })
        : null,
    [userAddress],
  )

  const portfolioAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, { assetId: foxAssetId }),
  )

  const accountIds = maybeAccountIdFilter ? [maybeAccountIdFilter] : portfolioAccountIds

  const foxyBalances = useGetFoxyBalancesQuery(
    {
      foxyApr: foxyAprData?.foxyApr!,
      accountIds,
    },
    {
      skip:
        !foxyAprData ||
        !supportsEthereumChain ||
        !!(!maybeAccountIdFilter && accountNumber !== undefined) ||
        !!(!userAddress?.length && accountNumber !== undefined),
    },
  )

  return foxyBalances
}

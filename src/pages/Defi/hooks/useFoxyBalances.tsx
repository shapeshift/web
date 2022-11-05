import { ethChainId, fromAccountId, toAccountId } from '@keepkey/caip'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { useGetFoxyAprQuery, useGetFoxyBalancesQuery } from 'state/apis/foxy/foxyApi'
import { selectPortfolioAccountsGroupedByNumberByChainId } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

export function useFoxyBalances({ accountNumber }: { accountNumber: number }) {
  const {
    state: { wallet },
  } = useWallet()

  const accountsByNumber = useAppSelector(state =>
    selectPortfolioAccountsGroupedByNumberByChainId(state, { chainId: ethChainId }),
  )

  const userAddress = useMemo(() => {
    const accountId = accountsByNumber[accountNumber ?? 0]?.[0] // Only one address per account for EVM chains i.e no multiple accountTypes
    return accountId ? fromAccountId(accountId).account : null
  }, [accountNumber, accountsByNumber])

  const { data: foxyAprData } = useGetFoxyAprQuery()

  const supportsEthereumChain = useWalletSupportsChain({ chainId: ethChainId, wallet })

  const accountId = useMemo(
    () =>
      userAddress?.length
        ? toAccountId({
            chainId: ethChainId,
            account: userAddress!,
          })
        : null,
    [userAddress],
  )

  const foxyBalances = useGetFoxyBalancesQuery(
    {
      foxyApr: foxyAprData?.foxyApr!,
      accountId: accountId!,
    },
    {
      skip: !Boolean(userAddress?.length) || !foxyAprData || !supportsEthereumChain || !accountId,
    },
  )

  return foxyBalances
}

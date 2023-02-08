import type { ChainId } from '@shapeshiftoss/caip'
import { Account } from 'plugins/walletConnectV2/components/Account'
import type { FC } from 'react'
import { useMemo } from 'react'
import { selectPortfolioAccountsGroupedByNumberByChainId } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

interface IProps {
  chainId: ChainId
  toggleAccountId: (accountId: string) => void
  selectedAccountIds: string[]
}

export const AccountSelectionByChainId: FC<IProps> = ({
  chainId,
  selectedAccountIds,
  toggleAccountId,
}) => {
  const filter = useMemo(() => ({ chainId }), [chainId])
  const accountIdsByAccountNumber = useAppSelector(s =>
    selectPortfolioAccountsGroupedByNumberByChainId(s, filter),
  )
  return (
    <>
      {Object.entries(accountIdsByAccountNumber).map(([accountNumber, accountIds]) => {
        // FIXME: Why would we have more than one accountId here? 🤔
        const isSelected = selectedAccountIds.some(accountId => accountId === accountIds[0])
        return (
          <Account
            accountId={accountIds[0]}
            accountNumber={accountNumber}
            isSelected={isSelected}
            toggleAccountId={toggleAccountId}
          ></Account>
        )
      })}
    </>
  )
}

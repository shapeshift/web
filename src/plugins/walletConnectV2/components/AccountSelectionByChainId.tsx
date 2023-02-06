import type { ChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { RawText } from 'components/Text'
import { selectPortfolioAccountsGroupedByNumberByChainId } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

interface IProps {
  chainId: ChainId
}

export const AccountSelectionByChainId: FC<IProps> = ({ chainId }) => {
  const filter = useMemo(() => ({ chainId }), [chainId])
  const accountIdsByAccountNumber = useAppSelector(s =>
    selectPortfolioAccountsGroupedByNumberByChainId(s, filter),
  )
  return (
    <>
      {Object.entries(accountIdsByAccountNumber).map(([accountNumber, accountIds]) => {
        // FIXME: Why would we have more than one accountId here? 🤔
        return (
          <RawText>
            {accountNumber}: {accountIds.join(', ')}
          </RawText>
        )
      })}
    </>
  )
}

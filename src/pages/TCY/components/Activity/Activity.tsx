import { Card, CardHeader, Heading } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { RecentTransactionsBody } from '@/pages/Dashboard/RecentTransactions'
import { selectAccountIdsByAssetId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

type ActivityProps = {
  activeAccountNumber: number
}

export const Activity = ({ activeAccountNumber }: ActivityProps) => {
  const runeAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )

  const accountId = useMemo(
    () => runeAccountIds[activeAccountNumber],
    [runeAccountIds, activeAccountNumber],
  )

  const filter = useMemo(
    () => ({
      parser: 'thorchain' as const,
      memo: 'tcy',
      accountId,
    }),
    [accountId],
  )

  return (
    <Card>
      <CardHeader>
        <Heading size='sm'>Activity</Heading>
      </CardHeader>
      <RecentTransactionsBody filter={filter} limit={8} />
    </Card>
  )
}

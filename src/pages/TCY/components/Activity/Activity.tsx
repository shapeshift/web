import { Card, CardHeader, Heading } from '@chakra-ui/react'
import { useMemo } from 'react'

import type { CurrentAccount } from '../../tcy'

import { RecentTransactionsBody } from '@/pages/Dashboard/RecentTransactions'

type ActivityProps = {
  currentAccount: CurrentAccount
}

export const Activity = ({ currentAccount }: ActivityProps) => {
  const accountId = currentAccount.accountId

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

import { Box, CardBody } from '@chakra-ui/react'
import { useMemo } from 'react'

import { RecentTransactionsBody } from '@/pages/Dashboard/RecentTransactions'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'

type ActivityProps = {
  headerComponent: JSX.Element
}

export const Activity = ({ headerComponent }: ActivityProps) => {
  const { stakingAssetAccountId } = useRFOXContext()

  const filter = useMemo(
    () => ({
      accountId: stakingAssetAccountId,
      parser: 'rfox' as const,
    }),
    [stakingAssetAccountId],
  )

  return (
    <CardBody>
      {headerComponent}
      <Box py={4}>
        <RecentTransactionsBody filter={filter} limit={8} />
      </Box>
    </CardBody>
  )
}

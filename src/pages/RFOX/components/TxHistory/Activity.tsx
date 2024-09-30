import { Box, CardBody } from '@chakra-ui/react'
import { useMemo } from 'react'
import { RecentTransactionsBody } from 'pages/Dashboard/RecentTransactions'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'

type ClaimsProps = {
  headerComponent: JSX.Element
}

export const Activity = ({ headerComponent }: ClaimsProps) => {
  const { stakingAssetAccountId } = useRFOXContext()

  const filter = useMemo(
    () => ({
      accountId: stakingAssetAccountId,
      isRfoxTx: true,
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

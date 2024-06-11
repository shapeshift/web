import { Box, CardBody } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { rune } from 'test/mocks/assets'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { selectTxIdsByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type RewardsProps = {
  headerComponent: JSX.Element
}

export const Rewards = ({ headerComponent }: RewardsProps) => {
  const filter = useMemo(() => ({ txStatus: TxStatus.Confirmed, assetIdFilter: rune.assetId }), [])
  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))
  const limitTxIds = useMemo(() => {
    return txIds.slice(0, Number(5))
  }, [txIds])

  return (
    <CardBody>
      {headerComponent}

      <Box mx={-6}>
        <TransactionsGroupByDate txIds={limitTxIds} />
      </Box>
    </CardBody>
  )
}

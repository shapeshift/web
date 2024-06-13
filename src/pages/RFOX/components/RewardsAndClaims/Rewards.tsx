import { Box, CardBody } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { selectTxIdsByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type RewardsProps = {
  headerComponent: JSX.Element
}

export const Rewards = ({ headerComponent }: RewardsProps) => {
  const filter = useMemo(
    () => ({ txStatus: TxStatus.Confirmed, assetIdFilter: thorchainAssetId }),
    [],
  )
  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))
  const txIdsFilter = useMemo(() => {
    // @TODO: Remove this slice when we have pagination in place, if we ever need a pagination
    return txIds.slice(0, Number(5))
  }, [txIds])

  return (
    <CardBody>
      {headerComponent}

      <Box mx={-6}>
        <TransactionsGroupByDate txIds={txIdsFilter} />
      </Box>
    </CardBody>
  )
}

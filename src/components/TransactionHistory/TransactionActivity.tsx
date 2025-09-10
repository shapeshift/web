import { Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useMemo } from 'react'

import { TransactionHistoryList } from '@/components/TransactionHistory/TransactionHistoryList'
import { selectTxIdsBasedOnSearchTermAndFilters } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionActivityProps = {
  forceCompactView?: boolean
}

export const TransactionActivity: FC<TransactionActivityProps> = memo(({ forceCompactView }) => {
  const selectorFilters = useMemo(
    () => ({
      matchingAssets: null,
      fromDate: null,
      toDate: null,
      types: null,
    }),
    [],
  )

  const txIds = useAppSelector(state =>
    selectTxIdsBasedOnSearchTermAndFilters(state, selectorFilters),
  )

  return (
    <Box width='full' height='full'>
      <TransactionHistoryList
        txIds={txIds}
        useCompactMode={forceCompactView}
        initialTxsCount={20}
      />
    </Box>
  )
})

import { Box } from '@chakra-ui/react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'
import type { Period } from '../../lib/periods'
import { EmptyState } from '../EmptyState'
import { ErrorBanner } from '../ErrorBanner'
import { PeriodSelector } from '../PeriodSelector'
import { Pagination } from './Pagination'
import { SwapsTable } from './SwapsTable'

interface SwapsTabProps {
  swaps: AffiliateSwap[]
  nextCursor: string | null
  pageNumber: number
  isFetching: boolean
  error: string | undefined
  periods: Period[]
  selectedPeriod: number
  onSelectPeriod: (index: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
}

export const SwapsTab = ({
  swaps,
  nextCursor,
  pageNumber,
  isFetching,
  error,
  periods,
  selectedPeriod,
  onSelectPeriod,
  onPreviousPage,
  onNextPage,
}: SwapsTabProps): React.JSX.Element => {
  const showPagination = pageNumber > 1 || Boolean(nextCursor)

  return (
    <>
      <PeriodSelector periods={periods} selectedIndex={selectedPeriod} onSelect={onSelectPeriod} />
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {isFetching && swaps.length === 0 && <EmptyState>Loading swaps...</EmptyState>}
      {!isFetching && swaps.length === 0 && !error && (
        <EmptyState>No swaps found for this period.</EmptyState>
      )}
      {swaps.length > 0 && (
        <Box opacity={isFetching ? 0.6 : 1} transition='opacity 150ms ease' aria-busy={isFetching}>
          <SwapsTable swaps={swaps} />
          {showPagination && (
            <Pagination
              pageNumber={pageNumber}
              hasNext={Boolean(nextCursor)}
              onPrevious={onPreviousPage}
              onNext={onNextPage}
            />
          )}
        </Box>
      )}
    </>
  )
}

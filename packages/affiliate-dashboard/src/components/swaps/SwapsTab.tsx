import { Box } from '@chakra-ui/react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'
import { SWAPS_PER_PAGE } from '../../lib/constants'
import type { Period } from '../../lib/periods'
import { EmptyState } from '../EmptyState'
import { ErrorBanner } from '../ErrorBanner'
import { PeriodSelector } from '../PeriodSelector'
import { Pagination } from './Pagination'
import { SwapsTable } from './SwapsTable'

interface SwapsTabProps {
  swaps: AffiliateSwap[]
  total: number
  isFetching: boolean
  error: string | undefined
  periods: Period[]
  selectedPeriod: number
  onSelectPeriod: (index: number) => void
  page: number
  onPageChange: (page: number) => void
}

export const SwapsTab = ({
  swaps,
  total,
  isFetching,
  error,
  periods,
  selectedPeriod,
  onSelectPeriod,
  page,
  onPageChange,
}: SwapsTabProps): React.JSX.Element => {
  const totalPages = Math.ceil(total / SWAPS_PER_PAGE)

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
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
          )}
        </Box>
      )}
    </>
  )
}

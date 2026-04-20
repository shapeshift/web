import { Box, SimpleGrid } from '@chakra-ui/react'

import type { AffiliateStats } from '../../hooks/useAffiliateStats'
import { formatNumber, formatUsd } from '../../lib/format'
import type { Period } from '../../lib/periods'
import { EmptyState } from '../EmptyState'
import { ErrorBanner } from '../ErrorBanner'
import { PeriodSelector } from '../PeriodSelector'
import { StatCard } from './StatCard'

interface OverviewTabProps {
  stats: AffiliateStats | undefined
  isFetching: boolean
  error: string | undefined
  periods: Period[]
  selectedPeriod: number
  onSelectPeriod: (index: number) => void
}

export const OverviewTab = ({
  stats,
  isFetching,
  error,
  periods,
  selectedPeriod,
  onSelectPeriod,
}: OverviewTabProps): React.JSX.Element => {
  const cards = stats && [
    { label: 'Total Swaps', value: formatNumber(stats.totalSwaps) },
    { label: 'Total Volume', value: formatUsd(stats.totalVolumeUsd) },
    { label: 'Fees Earned', value: formatUsd(stats.totalFeesUsd) },
  ]

  return (
    <>
      <PeriodSelector periods={periods} selectedIndex={selectedPeriod} onSelect={onSelectPeriod} />
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {isFetching && !stats && <EmptyState>Loading...</EmptyState>}
      {cards && (
        <Box
          mb={6}
          opacity={isFetching ? 0.6 : 1}
          transition='opacity 150ms ease'
          aria-busy={isFetching}
        >
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
            {cards.map(card => (
              <StatCard key={card.label} label={card.label} value={card.value} />
            ))}
          </SimpleGrid>
        </Box>
      )}
      {!stats && !error && !isFetching && (
        <EmptyState>No affiliate stats found for this address.</EmptyState>
      )}
    </>
  )
}

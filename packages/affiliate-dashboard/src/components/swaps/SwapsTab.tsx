import { Box, Flex, Spinner, Text } from '@chakra-ui/react'
import { useRef } from 'react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'
import { useInfiniteScrollSentinel } from '../../hooks/useInfiniteScrollSentinel'
import { EmptyState } from '../EmptyState'
import { ErrorBanner } from '../ErrorBanner'
import { SwapsTable } from './SwapsTable'

interface SwapsTabProps {
  swaps: AffiliateSwap[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  error: string | undefined
  onLoadMore: () => void
}

const hideScrollbarSx = {
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
}

export const SwapsTab = ({
  swaps,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  error,
  onLoadMore,
}: SwapsTabProps): React.JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>({
    hasMore: hasNextPage,
    isFetching: isFetchingNextPage,
    onLoadMore,
    root: scrollRef,
  })

  if (error) return <ErrorBanner>{error}</ErrorBanner>
  if (isLoading && swaps.length === 0) return <EmptyState>Loading swaps...</EmptyState>
  if (!isLoading && swaps.length === 0)
    return <EmptyState>No swaps found for this period.</EmptyState>

  return (
    <Box
      ref={scrollRef}
      flex={1}
      minH={0}
      overflowY='auto'
      border='1px solid'
      borderColor='border.subtle'
      borderRadius='xl'
      opacity={isLoading ? 0.6 : 1}
      transition='opacity 150ms ease'
      aria-busy={isLoading}
      sx={hideScrollbarSx}
    >
      <SwapsTable swaps={swaps} />
      {hasNextPage && <Box ref={sentinelRef} h='1px' />}
      {isFetchingNextPage && (
        <Flex justify='center' py={4}>
          <Spinner size='md' color='fg.muted' />
        </Flex>
      )}
      {!hasNextPage && !isFetchingNextPage && (
        <Flex justify='center' py={4}>
          <Text color='fg.muted'>No more swaps</Text>
        </Flex>
      )}
    </Box>
  )
}

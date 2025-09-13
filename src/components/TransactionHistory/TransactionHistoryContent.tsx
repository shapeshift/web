import { Flex, Stack } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'

import { TransactionHistoryList } from '@/components/TransactionHistory/TransactionHistoryList'
import { isSome } from '@/lib/utils'
import { DownloadButton } from '@/pages/TransactionHistory/DownloadButton'
import { useFilters } from '@/pages/TransactionHistory/hooks/useFilters'
import { useSearch } from '@/pages/TransactionHistory/hooks/useSearch'
import { TransactionHistoryFilter } from '@/pages/TransactionHistory/TransactionHistoryFilter'
import { TransactionHistorySearch } from '@/pages/TransactionHistory/TransactionHistorySearch'
import { selectTxIdsBasedOnSearchTermAndFilters } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionHistoryContentProps = {
  isCompact?: boolean
}

export const TransactionHistoryContent = memo(
  ({ isCompact = false }: TransactionHistoryContentProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const { searchTerm, matchingAssets, handleInputChange } = useSearch()
    const { filters, setFilters, resetFilters } = useFilters()

    const selectorFilters = useMemo(
      () => ({
        matchingAssets: matchingAssets?.map(asset => asset.assetId) ?? null,
        ...filters,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [searchTerm, filters],
    )

    const txIds = useAppSelector(state =>
      selectTxIdsBasedOnSearchTermAndFilters(state, selectorFilters),
    )

    const handleReset = useCallback(() => {
      resetFilters()
      if (inputRef?.current?.value) {
        inputRef.current.value = ''
        handleInputChange('')
      }
    }, [handleInputChange, resetFilters])

    const headingPadding = isCompact ? 0 : [2, 3, 6]
    const stackMargin = isCompact ? 0 : { base: 0, xl: -4, '2xl': -6 }

    return (
      <Stack mx={stackMargin}>
        <Flex width='full' justifyContent='space-between' p={headingPadding}>
          <Flex>
            <TransactionHistorySearch
              ref={inputRef}
              isCompact={isCompact}
              handleInputChange={handleInputChange}
            />
            <TransactionHistoryFilter
              resetFilters={handleReset}
              setFilters={setFilters}
              hasAppliedFilter={!!Object.values(filters).filter(isSome).length}
              isCompact={isCompact}
            />
          </Flex>
          <DownloadButton txIds={txIds} isCompact={isCompact} />
        </Flex>
        <TransactionHistoryList txIds={txIds} useCompactMode={isCompact} />
      </Stack>
    )
  },
)

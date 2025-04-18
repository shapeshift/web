import { Flex, Stack } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes } from 'react-router-dom'

import { DownloadButton } from './DownloadButton'
import { useFilters } from './hooks/useFilters'
import { useSearch } from './hooks/useSearch'
import { SingleTransaction } from './SingleTransaction'
import { TransactionHistoryFilter } from './TransactionHistoryFilter'
import { TransactionHistorySearch } from './TransactionHistorySearch'

import { SEO } from '@/components/Layout/Seo'
import { TransactionHistoryList } from '@/components/TransactionHistory/TransactionHistoryList'
import { isSome } from '@/lib/utils'
import { selectTxIdsBasedOnSearchTermAndFilters } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const headingPadding = [2, 3, 6]
const stackMargin = { base: 0, xl: -4, '2xl': -6 }

const singleTransaction = <SingleTransaction />

const TransactionHistoryContent = () => {
  const translate = useTranslate()
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

  return (
    <Stack mx={stackMargin}>
      <SEO title={translate('transactionHistory.transactionHistory')} />
      <Flex width='full' justifyContent='space-between' p={headingPadding}>
        <Flex>
          <TransactionHistorySearch ref={inputRef} handleInputChange={handleInputChange} />
          <TransactionHistoryFilter
            resetFilters={handleReset}
            setFilters={setFilters}
            hasAppliedFilter={!!Object.values(filters).filter(isSome).length}
          />
        </Flex>
        <DownloadButton txIds={txIds} />
      </Flex>
      <TransactionHistoryList txIds={txIds} />
    </Stack>
  )
}

const transactionHistory = <TransactionHistoryContent />

export const TransactionHistory = memo(() => {
  return (
    <Routes>
      <Route path='/' element={transactionHistory} />
      <Route path='/transaction/:txId' element={singleTransaction} />
    </Routes>
  )
})

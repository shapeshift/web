import { Flex } from '@chakra-ui/react'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { isSome } from 'lib/utils'
import { DashboardHeader } from 'pages/Dashboard/components/DashboardHeader'
import { selectTxIdsBasedOnSearchTermAndFilters } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DownloadButton } from './DownloadButton'
import { useFilters } from './hooks/useFilters'
import { useSearch } from './hooks/useSearch'
import { TransactionHistoryFilter } from './TransactionHistoryFilter'
import { TransactionHistorySearch } from './TransactionHistorySearch'

export const TransactionHistory = () => {
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
    <Main headerComponent={<DashboardHeader />}>
      <SEO title={translate('transactionHistory.transactionHistory')} />
      <Card>
        <Card.Heading p={[2, 3, 6]}>
          <Flex justifyContent='space-between'>
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
        </Card.Heading>
        <TransactionHistoryList txIds={txIds} />
      </Card>
    </Main>
  )
}

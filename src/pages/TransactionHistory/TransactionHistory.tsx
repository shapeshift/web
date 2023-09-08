import { Card, Flex, Heading } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useRouteMatch } from 'react-router'
import { SEO } from 'components/Layout/Seo'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { isSome } from 'lib/utils'
import { selectTxIdsBasedOnSearchTermAndFilters } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DownloadButton } from './DownloadButton'
import { useFilters } from './hooks/useFilters'
import { useSearch } from './hooks/useSearch'
import { SingleTransaction } from './SingleTransaction'
import { TransactionHistoryFilter } from './TransactionHistoryFilter'
import { TransactionHistorySearch } from './TransactionHistorySearch'

const headingPadding = [2, 3, 6]

export const TransactionHistory = memo(() => {
  const translate = useTranslate()
  const { path } = useRouteMatch()
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
    <Switch>
      <Route exact path={`${path}/`}>
        <Card>
          <SEO title={translate('transactionHistory.transactionHistory')} />
          <Heading p={headingPadding}>
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
          </Heading>
          <TransactionHistoryList txIds={txIds} />
        </Card>
      </Route>
      <Route path={`${path}/transaction/:txId`}>
        <SingleTransaction />
      </Route>
    </Switch>
  )
})

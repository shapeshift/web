import { Box, Button, CardBody, Flex } from '@chakra-ui/react'
import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Text } from '@/components/Text'
import { TransactionsGroupByDate } from '@/components/TransactionHistory/TransactionsGroupByDate'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import {
  selectAccountIdsByChainIdFilter,
  selectTxHistoryPagination,
  selectTxIdsByFilter,
} from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ActivityProps = {
  headerComponent: JSX.Element
}

export const Activity = ({ headerComponent }: ActivityProps) => {
  const { stakingAssetAccountId } = useRFOXContext()
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const arbitrumAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  const paginationState = useAppSelector(selectTxHistoryPagination)

  const rfoxTxIdsFilter = useMemo(
    () => ({
      accountId: stakingAssetAccountId,
      chainId: arbitrumChainId,
      parser: 'rfox' as const,
    }),
    [stakingAssetAccountId],
  )

  const rfoxTxIds = useAppSelector(state => selectTxIdsByFilter(state, rfoxTxIdsFilter))

  const rfoxTxIdsLengthRef = useRef(rfoxTxIds.length)

  useEffect(() => {
    rfoxTxIdsLengthRef.current = rfoxTxIds.length
  }, [rfoxTxIds.length])

  // Check if any arbitrum account has more pages
  const isAnyAccountIdHasMore = useCallback(() => {
    if (arbitrumAccountIds.length === 0) return false

    return arbitrumAccountIds.some(accountId => {
      const pagination = paginationState[accountId]
      return pagination?.hasMore
    })
  }, [arbitrumAccountIds, paginationState])

  // Custom load more handler - keep loading until we find new RFOX txs
  // This is different from the one in <TransactionHistoryList /> as we specifically keep on loading more pages until we find new RFOX transactions,
  // vs. loading one page per click normally
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || arbitrumAccountIds.length === 0 || !hasMore) return

    setIsLoadingMore(true)
    let nextPage = currentPage + 1
    let initialTxCount = rfoxTxIdsLengthRef.current
    let foundNewTxs = false

    while (!foundNewTxs) {
      try {
        // Local reassignment for closure purposes only, don't try to optimize me, this is on purpose
        const pageToFetch = nextPage

        await Promise.all(
          arbitrumAccountIds.map(accountId =>
            dispatch(
              txHistoryApi.endpoints.getAllTxHistory.initiate(
                {
                  accountId,
                  page: pageToFetch,
                },
                { forceRefetch: true },
              ),
            ).unwrap(),
          ),
        )

        if (rfoxTxIdsLengthRef.current > initialTxCount) {
          foundNewTxs = true
          break
        }

        // No new RFOX transactions, try next page
        nextPage++

        const anyAccountHasMore = isAnyAccountIdHasMore()

        if (!anyAccountHasMore) {
          setHasMore(false)
          break
        }
      } catch (error) {
        console.error('Error loading transactions:', error)
        break
      }
    }

    setCurrentPage(nextPage)
    setIsLoadingMore(false)
  }, [arbitrumAccountIds, isAnyAccountIdHasMore, currentPage, dispatch, hasMore, isLoadingMore])

  return (
    <CardBody>
      {headerComponent}
      <Box py={4} width='full'>
        {rfoxTxIds.length > 0 ? (
          <TransactionsGroupByDate txIds={rfoxTxIds} useCompactMode={true} />
        ) : (
          <Text
            color='text.subtle'
            translation='assets.assetDetails.assetHistory.emptyTransactions'
          />
        )}

        {hasMore && (
          <Flex justifyContent='center' mt={4} width='full'>
            <Button
              onClick={handleLoadMore}
              isDisabled={isLoadingMore}
              rightIcon={isLoadingMore ? <CircularProgress isIndeterminate size={4} /> : undefined}
              width='full'
            >
              {translate('common.loadMore')}
            </Button>
          </Flex>
        )}
      </Box>
    </CardBody>
  )
}

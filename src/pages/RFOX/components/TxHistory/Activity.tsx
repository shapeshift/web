import { Box, Button, CardBody, Flex } from '@chakra-ui/react'
import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useRef, useState } from 'react'
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

  // Create a filter for RFOX-related transactions
  const filter = useCallback(
    () => ({
      accountId: stakingAssetAccountId,
      chainId: arbitrumChainId,
      parser: 'rfox' as const,
    }),
    [stakingAssetAccountId],
  )

  // Get filtered RFOX transaction IDs
  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter()))

  // Use a ref to track the current txIds length for comparison
  const txIdsLengthRef = useRef(txIds.length)

  // Update ref when txIds changes
  useEffect(() => {
    txIdsLengthRef.current = txIds.length
  }, [txIds.length])

  // Load initial transactions on mount
  useEffect(() => {
    if (arbitrumAccountIds.length === 0) return

    arbitrumAccountIds.forEach(accountId => {
      dispatch(
        txHistoryApi.endpoints.getAllTxHistory.initiate(
          {
            accountId,
            page: 1,
            pageSize: 25,
          },
          { forceRefetch: true },
        ),
      )
    })
  }, [arbitrumAccountIds, dispatch])

  // Check if any arbitrum account has more pages
  const isAnyAccountIdHasMore = useCallback(() => {
    if (arbitrumAccountIds.length === 0) return false

    return arbitrumAccountIds.some(accountId => {
      const pagination = paginationState[accountId]
      return pagination?.hasMore
    })
  }, [arbitrumAccountIds, paginationState])

  // Custom load more handler - keep loading until we find new RFOX txs
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || arbitrumAccountIds.length === 0 || !hasMore) return

    setIsLoadingMore(true)
    let nextPage = currentPage + 1
    let initialTxCount = txIdsLengthRef.current
    let foundNewTxs = false

    // Keep loading pages until we find new RFOX transactions
    while (!foundNewTxs) {
      try {
        // Local reassignment for closure purposes only, don't try to optimize me, this is on purpose
        const pageToFetch = nextPage

        // Load the next page for all Arbitrum accounts
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

        if (txIdsLengthRef.current > initialTxCount) {
          foundNewTxs = true
          break
        }

        // No new RFOX transactions, try next page
        nextPage++

        // Check if any account has more pages based on pagination state
        const anyAccountHasMore = isAnyAccountIdHasMore()

        // If no account has more pages, stop loading
        if (!anyAccountHasMore) {
          setHasMore(false)
          break
        }
      } catch (error) {
        console.error('Error loading transactions:', error)
        break
      }
    }

    // Update page number and loading state
    setCurrentPage(nextPage)
    setIsLoadingMore(false)
  }, [arbitrumAccountIds, isAnyAccountIdHasMore, currentPage, dispatch, hasMore, isLoadingMore])

  return (
    <CardBody>
      {headerComponent}
      <Box py={4} width='full'>
        {txIds.length > 0 ? (
          <TransactionsGroupByDate txIds={txIds} useCompactMode={true} />
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

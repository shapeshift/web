import { Box, Button, CardBody, Flex, Skeleton } from '@chakra-ui/react'
import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { ClaimRow } from './ClaimRow'
import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimsByStatus } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { ClaimStatus } from '@/components/ClaimRow/types'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import {
  selectAccountIdsByChainIdFilter,
  selectTxHistoryPagination,
} from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ClaimSelectProps = {
  setActiveClaim: (claim: ClaimDetails) => void
}

export const ClaimSelect: React.FC<ClaimSelectProps> = ({ setActiveClaim }) => {
  const history = useHistory()
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Get Arbitrum account IDs
  const arbitrumAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  // Get pagination state for all accounts
  const paginationState = useAppSelector(selectTxHistoryPagination)

  const handleClaimClick = useCallback(
    (claim: ClaimDetails) => {
      setActiveClaim(claim)
      history.push(ClaimRoutePaths.Confirm)
    },
    [history, setActiveClaim],
  )

  const { claimsByStatus, isLoading } = useArbitrumClaimsByStatus()

  // Use refs to track the current claims counts for comparison
  const availableClaimsCountRef = useRef(0)
  const pendingClaimsCountRef = useRef(0)

  // Update refs when claims change
  useEffect(() => {
    availableClaimsCountRef.current = claimsByStatus.Available.length
    pendingClaimsCountRef.current = claimsByStatus.Pending.length
  }, [claimsByStatus.Available.length, claimsByStatus.Pending.length])

  // Load initial transactions on mount
  useEffect(() => {
    if (arbitrumAccountIds.length === 0) return

    arbitrumAccountIds.forEach(accountId => {
      dispatch(
        txHistoryApi.endpoints.getAllTxHistory.initiate(
          {
            accountId,
            page: 1,
            pageSize: 100,
          },
          { forceRefetch: true },
        ),
      )
    })
  }, [arbitrumAccountIds, dispatch])

  // Check if any arbitrum account has more pages
  const checkIfAnyAccountHasMore = useCallback(() => {
    // If no accounts, there are no more pages
    if (arbitrumAccountIds.length === 0) return false

    // Check if any arbitrum account has more pages
    return arbitrumAccountIds.some(accountId => {
      const pagination = paginationState[accountId]
      return pagination?.hasMore
    })
  }, [arbitrumAccountIds, paginationState])

  // Custom load more handler - keep loading until we find new claims
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || arbitrumAccountIds.length === 0 || !hasMore) return

    setIsLoadingMore(true)
    let nextPage = currentPage + 1
    let initialAvailableClaimsCount = availableClaimsCountRef.current
    let initialPendingClaimsCount = pendingClaimsCountRef.current
    let foundNewClaims = false

    // Keep loading pages until we find new claims or hit the limit
    while (!foundNewClaims) {
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
                  pageSize: 100,
                },
                { forceRefetch: true },
              ),
            ).unwrap(),
          ),
        )

        // Small delay to allow state to update and arbitrumWithdrawTxs to be populated
        await new Promise(resolve => setTimeout(resolve, 300))

        // Check if we have more claims now than before
        if (
          availableClaimsCountRef.current > initialAvailableClaimsCount ||
          pendingClaimsCountRef.current > initialPendingClaimsCount
        ) {
          // Found new claims!
          foundNewClaims = true
        } else {
          // No new claims, try next page
          nextPage++

          // Check if any account has more pages based on pagination state
          const anyAccountHasMore = checkIfAnyAccountHasMore()

          // If no account has more pages, stop loading
          if (!anyAccountHasMore) {
            setHasMore(false)
            break
          }
        }
      } catch (error) {
        console.error('Error loading transactions:', error)
        break
      }
    }

    // Update page number and loading state
    setCurrentPage(nextPage)
    setIsLoadingMore(false)
  }, [arbitrumAccountIds, checkIfAnyAccountHasMore, currentPage, dispatch, hasMore, isLoadingMore])

  const AvailableClaims = useMemo(() => {
    if (isLoading) return <Skeleton height={16} />
    if (!claimsByStatus.Available.length)
      return <Text color='text.subtle' translation={'bridge.noAvailableClaims'} />

    return claimsByStatus.Available.map(claim => (
      <ClaimRow
        key={claim.tx.txid}
        claim={claim}
        status={ClaimStatus.Available}
        onClaimClick={handleClaimClick}
      />
    ))
  }, [claimsByStatus.Available, isLoading, handleClaimClick])

  const PendingClaims = useMemo(() => {
    if (isLoading) return <Skeleton height={16} />
    if (!claimsByStatus.Pending.length)
      return <Text color='text.subtle' translation={'bridge.noPendingClaims'} />

    return claimsByStatus.Pending.map(claim => (
      <ClaimRow
        key={claim.tx.txid}
        claim={claim}
        status={ClaimStatus.Pending}
        onClaimClick={handleClaimClick}
      />
    ))
  }, [claimsByStatus.Pending, isLoading, handleClaimClick])

  return (
    <SlideTransition>
      <CardBody px={6}>
        <Box mb={6}>
          <Text as='h5' fontSize='md' translation='bridge.availableClaims' />
          {AvailableClaims}
        </Box>
        <Box mb={6}>
          <Text as='h5' fontSize='md' translation='bridge.pendingClaims' />
          {PendingClaims}
        </Box>
        {hasMore && arbitrumAccountIds.length > 0 && (
          <Flex justifyContent='center' width='full'>
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
      </CardBody>
    </SlideTransition>
  )
}

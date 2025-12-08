import {
  Box,
  Flex,
  Progress,
  Spinner,
  Text,
  useColorModeValue,
  useMediaQuery,
  usePrevious,
} from '@chakra-ui/react'
import { useIsFetching } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectIsAnyPortfolioGetAccountLoading } from '@/state/slices/portfolioSlice/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type PullToRefreshWrapperProps = {
  children: ReactNode
}

export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({ children }) => {
  const translate = useTranslate()
  const [isMobile] = useMediaQuery('(max-width: 768px)')
  const [showIndicator, setShowIndicator] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)

  // Track if portfolio queries are fetching
  const getAccountFetching = useIsFetching({ queryKey: ['getAccount'] })
  const portalsAccountFetching = useIsFetching({ queryKey: ['portalsAccount'] })
  const portalsPlatformsFetching = useIsFetching({ queryKey: ['portalsPlatforms'] })
  const isPortfolioLoading = useAppSelector(selectIsAnyPortfolioGetAccountLoading)

  const isFetching =
    getAccountFetching > 0 ||
    portalsAccountFetching > 0 ||
    portalsPlatformsFetching > 0 ||
    isPortfolioLoading
  const previousIsFetching = usePrevious(isFetching)

  const isLazyTxHistoryEnabled = useFeatureFlag('LazyTxHistory')

  const startY = useRef<number>(0)
  const endY = useRef<number>(0)
  const startTime = useRef<number>(0)
  const maxPullDistance = useRef<number>(0)
  const startScrollTop = useRef<number>(0)
  const isAtTopOnStart = useRef<boolean>(false)
  const hasPulledDown = useRef<boolean>(false)

  const bgColor = useColorModeValue('gray.50', 'background.surface.base')
  const progressColor = useColorModeValue('blue.500', 'blue.400')
  const textColor = useColorModeValue('gray.700', 'gray.200')
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (previousIsFetching && !isFetching) {
      setShowIndicator(false)
      setPullProgress(0)
    }
  }, [previousIsFetching, isFetching])

  const displayText = useMemo(() => {
    if (isFetching) return translate('pullToRefresh.refreshing')
    if (pullProgress >= 1) return translate('pullToRefresh.releaseToRefresh')
    if (pullProgress > 0.3) return translate('pullToRefresh.pullToRefresh')
    return ''
  }, [isFetching, pullProgress, translate])

  const iconRotation = useMemo(() => {
    return isFetching ? 'none' : `rotate(${pullProgress * 360}deg)`
  }, [isFetching, pullProgress])

  const indicatorTransform = useMemo(() => {
    if (isFetching) return 'translateY(0)'
    if (pullProgress === 0) return 'translateY(-100%)'
    const translateAmount = Math.max(pullProgress * 100 - 100, -100)
    return `translateY(${translateAmount}%)`
  }, [isFetching, pullProgress])

  const onRefresh = useCallback(() => {
    dispatch(portfolioApi.util.resetApiState())
    dispatch(txHistoryApi.util.resetApiState())

    const { getAllTxHistory } = txHistoryApi.endpoints

    enabledWalletAccountIds.forEach(accountId => {
      dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    })

    if (isLazyTxHistoryEnabled) return

    enabledWalletAccountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [dispatch, enabledWalletAccountIds, isLazyTxHistoryEnabled])

  useEffect(() => {
    if (!isMobile) return
    if (isFetching) return

    const handleTouchStart = (e: TouchEvent) => {
      if (isFetching) return

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      startScrollTop.current = scrollTop
      isAtTopOnStart.current = scrollTop === 0

      if (isAtTopOnStart.current) {
        startY.current = e.touches[0].clientY
        endY.current = startY.current
        startTime.current = Date.now()
        maxPullDistance.current = 0
        hasPulledDown.current = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTopOnStart.current || isFetching) return

      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
      const currentY = e.touches[0].clientY
      endY.current = currentY
      const distance = currentY - startY.current

      // Track the maximum pull distance
      if (distance > maxPullDistance.current) {
        maxPullDistance.current = distance
      }

      // Track if user actually pulled down (not just touched)
      if (distance > 30) {
        hasPulledDown.current = true
      }

      // Calculate pull progress (0 to 1) - requires 200px to reach 100%
      const progress = Math.min(Math.max(distance / 200, 0), 1)
      setPullProgress(progress)

      // Show indicator if pulling down at top of page
      if (currentScrollTop === 0 && distance > 10 && startScrollTop.current === 0) {
        setShowIndicator(true)
      } else {
        setShowIndicator(false)
        setPullProgress(0)
      }
    }

    const handleTouchEnd = async () => {
      if (!isAtTopOnStart.current) {
        setPullProgress(0)
        setTimeout(() => setShowIndicator(false), 200)
        return
      }

      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
      const distance = endY.current - startY.current
      const touchDuration = Date.now() - startTime.current

      // Calculate pull velocity (px/ms)
      const velocity = touchDuration > 0 ? distance / touchDuration : 0

      // Safety checks to prevent accidental refresh:
      // 1. Must be at the top (scrollTop is 0)
      // 2. Must have pulled down more than 200px
      // 3. Must have actually pulled down (not just tapped)
      // 4. Touch must have lasted at least 200ms (prevent quick swipes)
      // 5. Velocity must be reasonable (not too fast = likely a scroll)
      const shouldRefresh =
        currentScrollTop === 0 &&
        distance > 200 &&
        hasPulledDown.current &&
        touchDuration >= 250 &&
        velocity < 2 && // Slower than 2px/ms
        !isFetching

      if (shouldRefresh) {
        setShowIndicator(true)
        setPullProgress(1)

        try {
          await onRefresh()
        } finally {
          setTimeout(() => {
            setPullProgress(0)
            setTimeout(() => setShowIndicator(false), 300)
          }, 300)
        }
      } else {
        setPullProgress(0)
        setTimeout(() => setShowIndicator(false), 200)
      }

      isAtTopOnStart.current = false
      hasPulledDown.current = false
    }

    // Use passive listeners to not interfere with scrolling
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, isFetching, onRefresh])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <>
      {(showIndicator || isFetching) && (
        <Box position='fixed' top='0' left='0' right='0' zIndex={9999} pointerEvents='none'>
          <Box
            paddingTop='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
            bg={bgColor}
            transform={indicatorTransform}
            transition={
              isFetching
                ? 'transform 0.3s ease-out'
                : pullProgress === 0
                ? 'transform 0.2s ease-in'
                : 'transform 0.05s linear'
            }
            boxShadow='0px 10px 10px 0px rgba(0, 0, 0, 0.2)'
          >
            <Flex direction='column' align='center' justify='center' py={4} px={4} gap={2}>
              <Box>
                {isFetching ? (
                  <Spinner size='sm' color={progressColor} thickness='2px' speed='0.8s' />
                ) : (
                  <Box
                    as={FiRefreshCw}
                    fontSize='24px'
                    color={progressColor}
                    style={{ transform: iconRotation }}
                    transition='transform 0.1s ease-out'
                  />
                )}
              </Box>

              <Box
                width='100%'
                maxWidth='200px'
                height='3px'
                bg='whiteAlpha.200'
                borderRadius='full'
                mt={2}
              >
                {!isFetching && (
                  <Box
                    height='100%'
                    bg={progressColor}
                    borderRadius='full'
                    width={`${pullProgress * 100}%`}
                    transition='none'
                    boxShadow={pullProgress >= 1 ? `0 0 8px ${progressColor}` : 'none'}
                  />
                )}
                {isFetching && <Progress isIndeterminate={true} size='xs' colorScheme={'blue'} />}
              </Box>

              {displayText && (
                <Text fontSize='sm' fontWeight='medium' color={textColor}>
                  {displayText}
                </Text>
              )}
            </Flex>
          </Box>
        </Box>
      )}
      {children}
    </>
  )
}

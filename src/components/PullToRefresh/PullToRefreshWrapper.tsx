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
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
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

const MotionBox = motion(Box)

export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({ children }) => {
  const translate = useTranslate()
  const [isMobile] = useMediaQuery('(max-width: 768px)')
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)

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
  const isManualRefresh = useRef<boolean>(false)

  const bgColor = useColorModeValue('gray.50', 'background.surface.base')
  const progressColor = useColorModeValue('blue.500', 'blue.400')
  const textColor = useColorModeValue('gray.700', 'gray.200')
  const dispatch = useAppDispatch()

  // Framer Motion values
  const y = useMotionValue(0)
  const pullProgress = useTransform(y, [0, 200], [0, 1])
  const opacity = useTransform(y, [0, 50], [0, 1])

  useEffect(() => {
    if (previousIsFetching && !isFetching) {
      isManualRefresh.current = false
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
    }
  }, [previousIsFetching, isFetching, y])

  const [pullProgressValue, setPullProgressValue] = useState(0)
  useEffect(() => {
    const unsubscribe = pullProgress.on('change', v => setPullProgressValue(v))
    return unsubscribe
  }, [pullProgress])

  const displayText = useMemo(() => {
    if (isFetching && isManualRefresh.current) return translate('pullToRefresh.refreshing')
    if (pullProgressValue >= 1) return translate('pullToRefresh.releaseToRefresh')
    if (pullProgressValue > 0.3) return translate('pullToRefresh.pullToRefresh')
    return ''
  }, [isFetching, pullProgressValue, translate])

  const iconRotation = useMemo(() => {
    return isFetching && isManualRefresh.current ? 0 : pullProgressValue * 360
  }, [isFetching, pullProgressValue])


  const onRefresh = useCallback(() => {
    isManualRefresh.current = true
    animate(y, 130, { type: 'spring', stiffness: 300, damping: 30 })

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
  }, [dispatch, enabledWalletAccountIds, isLazyTxHistoryEnabled, y])

  const handleDragEnd = useCallback((_event: any, info: any) => {
    const shouldRefresh = info.offset.y > 200

    if (shouldRefresh) {
      onRefresh()
    } else {
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
    }
  }, [onRefresh, y])

  if (!isMobile) {
    return <>{children}</>
  }

  const showRefreshIndicator = pullProgressValue > 0 || (isFetching && isManualRefresh.current)

  return (
    <>
      {/* Drag handle area at top of screen */}
      <MotionBox
        position='fixed'
        top={0}
        left={0}
        right={0}
        height='50px'
        zIndex={9999}
        drag='y'
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.3, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y, touchAction: 'pan-y' }}
      />

      {/* Pull indicator */}
      {showRefreshIndicator && (
        <MotionBox
          position='fixed'
          top='-130px'
          left={0}
          right={0}
          height='130px'
          bg={bgColor}
          display='flex'
          alignItems='flex-end'
          justifyContent='center'
          paddingTop='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
          paddingBottom='10px'
          zIndex={9998}
          pointerEvents='none'
          style={{ y, opacity }}
        >
          <Flex direction='column' align='center' justify='center' gap={2}>
            <Box>
              {isFetching && isManualRefresh.current ? (
                <Spinner size='sm' color={progressColor} thickness='2px' speed='0.8s' />
              ) : (
                <Box
                  as={FiRefreshCw}
                  fontSize='24px'
                  color={progressColor}
                  style={{ transform: `rotate(${iconRotation}deg)` }}
                />
              )}
            </Box>

            <Box width='100%' maxWidth='200px' height='3px' bg='whiteAlpha.200' borderRadius='full'>
              {!(isFetching && isManualRefresh.current) && (
                <Box
                  height='100%'
                  bg={progressColor}
                  borderRadius='full'
                  width={`${pullProgressValue * 100}%`}
                  transition='none'
                  boxShadow={pullProgressValue >= 1 ? `0 0 8px ${progressColor}` : 'none'}
                />
              )}
              {isFetching && isManualRefresh.current && (
                <Progress isIndeterminate={true} size='xs' colorScheme={'blue'} />
              )}
            </Box>

            {displayText && (
              <Text fontSize='sm' fontWeight='medium' color={textColor}>
                {displayText}
              </Text>
            )}
          </Flex>
        </MotionBox>
      )}

      {children}
    </>
  )
}

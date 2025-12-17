import {
  Box,
  Flex,
  Progress,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'
import { usePullToRefresh } from 'use-pull-to-refresh'

type PullToRefreshListProps = {
  children: ReactNode
  onRefresh: () => void | Promise<void>
  isRefreshing?: boolean
}

export const PullToRefreshList: React.FC<PullToRefreshListProps> = ({
  children,
  onRefresh,
  isRefreshing = false,
}) => {
  const translate = useTranslate()
  const progressColor = useColorModeValue('blue.500', 'blue.400')
  const textColor = useColorModeValue('gray.700', 'gray.200')

  const { isRefreshing: isPulling, pullPosition } = usePullToRefresh({
    onRefresh,
    maximumPullLength: 150,
    refreshThreshold: 100,
  })

  const pullProgress = useMemo(() => {
    return Math.min(pullPosition / 100, 1)
  }, [pullPosition])

  const indicatorOpacity = useMemo(() => {
    return Math.min(pullPosition / 40, 1)
  }, [pullPosition])

  const displayText = useMemo(() => {
    if (isRefreshing) return translate('pullToRefresh.refreshing')
    if (pullProgress >= 1) return translate('pullToRefresh.releaseToRefresh')
    if (pullProgress > 0.2) return translate('pullToRefresh.pullToRefresh')
    return ''
  }, [isRefreshing, pullProgress, translate])

  const iconRotation = useMemo(() => {
    return isRefreshing ? 0 : pullProgress * 360
  }, [isRefreshing, pullProgress])

  const showIndicator = pullPosition > 0 || isRefreshing

  return (
    <Box position='relative' height='100%' overflow='auto'>
      {/* Pull indicator */}
      {showIndicator && (
        <Box
          position='absolute'
          top={0}
          left={0}
          right={0}
          height='90px'
          display='flex'
          alignItems='center'
          justifyContent='center'
          pointerEvents='none'
          opacity={indicatorOpacity}
          transform={`translateY(${Math.min(pullPosition - 90, 0)}px)`}
          transition='opacity 0.2s ease-out'
          zIndex={10}
        >
          <Flex direction='column' align='center' justify='center' gap={2}>
            <Box>
              {isRefreshing ? (
                <Spinner size='sm' color={progressColor} thickness='2px' speed='0.8s' />
              ) : (
                <Box
                  as={FiRefreshCw}
                  fontSize='24px'
                  color={progressColor}
                  transform={`rotate(${iconRotation}deg)`}
                  transition='transform 0.1s ease-out'
                />
              )}
            </Box>

            <Box
              width='100%'
              maxWidth='180px'
              height='3px'
              bg='whiteAlpha.200'
              borderRadius='full'
            >
              {!isRefreshing && (
                <Box
                  height='100%'
                  bg={progressColor}
                  borderRadius='full'
                  width={`${pullProgress * 100}%`}
                  transition='width 0.1s ease-out'
                  boxShadow={pullProgress >= 1 ? `0 0 8px ${progressColor}` : 'none'}
                />
              )}
              {isRefreshing && <Progress isIndeterminate={true} size='xs' colorScheme='blue' />}
            </Box>

            {displayText && (
              <Text fontSize='xs' fontWeight='medium' color={textColor}>
                {displayText}
              </Text>
            )}
          </Flex>
        </Box>
      )}

      {/* Content with dynamic padding to reveal indicator */}
      <Box paddingTop={showIndicator ? `${Math.min(pullPosition, 90)}px` : 0}>{children}</Box>
    </Box>
  )
}

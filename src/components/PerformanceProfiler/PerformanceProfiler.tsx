import { Box, Button, Flex, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiDownload, FiEye, FiEyeOff, FiRefreshCw, FiX } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import type { PerformanceReport } from '@/lib/performanceProfiler'
import { profiler } from '@/lib/performanceProfiler'

const REFRESH_INTERVAL_MS = 1000

export const PerformanceProfiler = () => {
  const t = useTranslate()
  const [metrics, setMetrics] = useState<PerformanceReport | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEnabled, setIsEnabled] = useState(profiler.isEnabled())

  useEffect(() => {
    const interval = setInterval(() => {
      if (profiler.isEnabled()) {
        setMetrics(profiler.getSnapshot())
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleToggleEnabled = useCallback(() => {
    if (profiler.isEnabled()) {
      profiler.disable()
      setIsEnabled(false)
    } else {
      profiler.enable()
      setIsEnabled(true)
    }
  }, [])

  const handleExport = useCallback(() => {
    profiler.exportJSON()
  }, [])

  const handleReset = useCallback(() => {
    profiler.reset()
    setMetrics(profiler.getSnapshot())
  }, [])

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const toggleTitle = useMemo(
    () => (isEnabled ? t('perfProfiler.disableProfiling') : t('perfProfiler.enableProfiling')),
    [isEnabled, t],
  )

  const expandAriaLabel = useMemo(() => t('perfProfiler.expandAria'), [t])
  const toggleAriaLabel = useMemo(() => t('perfProfiler.toggleAria'), [t])
  const collapseAriaLabel = useMemo(() => t('perfProfiler.collapseAria'), [t])

  if (!isExpanded) {
    return (
      <Box
        position='fixed'
        bottom={4}
        right={4}
        zIndex={9999}
        bg='gray.800'
        borderRadius='full'
        p={2}
      >
        <IconButton
          aria-label={expandAriaLabel}
          icon={<FiEye />}
          size='sm'
          variant='ghost'
          onClick={handleToggleExpand}
        />
      </Box>
    )
  }

  return (
    <Box
      position='fixed'
      bottom={4}
      right={4}
      bg='gray.800'
      borderRadius='md'
      p={3}
      zIndex={9999}
      minWidth='280px'
      maxWidth='320px'
      fontSize='xs'
      boxShadow='xl'
      border='1px solid'
      borderColor='gray.600'
    >
      <Flex justifyContent='space-between' alignItems='center' mb={2}>
        <Text fontWeight='bold' fontSize='sm'>
          {t('perfProfiler.title')}
        </Text>
        <HStack spacing={1}>
          <IconButton
            aria-label={toggleAriaLabel}
            icon={isEnabled ? <FiEyeOff /> : <FiEye />}
            size='xs'
            variant='ghost'
            onClick={handleToggleEnabled}
            title={toggleTitle}
          />
          <IconButton
            aria-label={collapseAriaLabel}
            icon={<FiX />}
            size='xs'
            variant='ghost'
            onClick={handleToggleExpand}
          />
        </HStack>
      </Flex>

      {!isEnabled && (
        <Text color='yellow.400' fontSize='xs' mb={2}>
          {t('perfProfiler.disabledMessage')}
        </Text>
      )}

      {isEnabled && metrics && (
        <VStack align='stretch' spacing={2}>
          <Box>
            <Text color='blue.300' fontWeight='semibold'>
              {metrics.browser}
            </Text>
            <Text color='gray.400'>
              {t('perfProfiler.session')}: {Math.round(metrics.sessionDuration / 1000)}s
            </Text>
          </Box>

          <Box>
            <Text color='cyan.300' fontWeight='semibold'>
              {t('perfProfiler.indexedDb')}
            </Text>
            <Text>
              {t('perfProfiler.reads')}: {metrics.indexedDB.readCount} ({t('perfProfiler.avg')}:{' '}
              {metrics.indexedDB.avgRead}ms, {t('perfProfiler.max')}: {metrics.indexedDB.maxRead}ms)
            </Text>
            <Text>
              {t('perfProfiler.writes')}: {metrics.indexedDB.writeCount} ({t('perfProfiler.avg')}:{' '}
              {metrics.indexedDB.avgWrite}ms, {t('perfProfiler.max')}: {metrics.indexedDB.maxWrite}
              ms)
            </Text>
          </Box>

          <Box>
            <Text color='green.300' fontWeight='semibold'>
              {t('perfProfiler.selectors')}
            </Text>
            <Text>
              {t('perfProfiler.totalCalls')}: {metrics.selectors.total} | {t('perfProfiler.slow')} (
              {'>'}16ms): {metrics.selectors.slowCount}
            </Text>
            {metrics.selectors.slowSelectors.slice(0, 5).map(s => (
              <Text key={s.name} color='yellow.200' pl={2}>
                {s.name.length > 30 ? `${s.name.slice(0, 30)}...` : s.name}: {s.maxTime}ms
              </Text>
            ))}
          </Box>

          <Box>
            <Text color='purple.300' fontWeight='semibold'>
              {t('perfProfiler.assetSearch')}
            </Text>
            <Text>
              {t('perfProfiler.searches')}: {metrics.assetSearch.searches} | {t('perfProfiler.avg')}
              : {metrics.assetSearch.avgLatency}ms | {t('perfProfiler.max')}:{' '}
              {metrics.assetSearch.maxLatency}ms
            </Text>
          </Box>

          <HStack spacing={2} pt={2}>
            <Button
              size='xs'
              leftIcon={<FiDownload />}
              onClick={handleExport}
              colorScheme='blue'
              variant='outline'
            >
              {t('perfProfiler.export')}
            </Button>
            <Button
              size='xs'
              leftIcon={<FiRefreshCw />}
              onClick={handleReset}
              colorScheme='gray'
              variant='outline'
            >
              {t('common.reset')}
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  )
}

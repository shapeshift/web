import { Box, Button, Flex, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { FiDownload, FiEye, FiEyeOff, FiRefreshCw, FiX } from 'react-icons/fi'

import type { PerformanceReport } from '@/lib/performanceProfiler'
import { profiler } from '@/lib/performanceProfiler'

const REFRESH_INTERVAL_MS = 1000

export const PerformanceProfiler = () => {
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
          aria-label='Expand profiler'
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
          Perf Profiler
        </Text>
        <HStack spacing={1}>
          <IconButton
            aria-label='Toggle profiler'
            icon={isEnabled ? <FiEyeOff /> : <FiEye />}
            size='xs'
            variant='ghost'
            onClick={handleToggleEnabled}
            title={isEnabled ? 'Disable profiling' : 'Enable profiling'}
          />
          <IconButton
            aria-label='Collapse'
            icon={<FiX />}
            size='xs'
            variant='ghost'
            onClick={handleToggleExpand}
          />
        </HStack>
      </Flex>

      {!isEnabled && (
        <Text color='yellow.400' fontSize='xs' mb={2}>
          Profiling disabled. Click eye icon to enable.
        </Text>
      )}

      {isEnabled && metrics && (
        <VStack align='stretch' spacing={2}>
          <Box>
            <Text color='blue.300' fontWeight='semibold'>
              {metrics.browser}
            </Text>
            <Text color='gray.400'>Session: {Math.round(metrics.sessionDuration / 1000)}s</Text>
          </Box>

          <Box>
            <Text color='cyan.300' fontWeight='semibold'>
              IndexedDB
            </Text>
            <Text>
              Reads: {metrics.indexedDB.readCount} (avg: {metrics.indexedDB.avgRead}ms, max:{' '}
              {metrics.indexedDB.maxRead}ms)
            </Text>
            <Text>
              Writes: {metrics.indexedDB.writeCount} (avg: {metrics.indexedDB.avgWrite}ms, max:{' '}
              {metrics.indexedDB.maxWrite}ms)
            </Text>
          </Box>

          <Box>
            <Text color='green.300' fontWeight='semibold'>
              Selectors
            </Text>
            <Text>
              Total calls: {metrics.selectors.total} | Slow ({'>'}16ms):{' '}
              {metrics.selectors.slowCount}
            </Text>
            {metrics.selectors.slowSelectors.slice(0, 5).map(s => (
              <Text key={s.name} color='yellow.200' pl={2}>
                {s.name.length > 30 ? `${s.name.slice(0, 30)}...` : s.name}: {s.maxTime}ms
              </Text>
            ))}
          </Box>

          <Box>
            <Text color='purple.300' fontWeight='semibold'>
              Asset Search
            </Text>
            <Text>
              Searches: {metrics.assetSearch.searches} | Avg: {metrics.assetSearch.avgLatency}ms |
              Max: {metrics.assetSearch.maxLatency}ms
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
              Export
            </Button>
            <Button
              size='xs'
              leftIcon={<FiRefreshCw />}
              onClick={handleReset}
              colorScheme='gray'
              variant='outline'
            >
              Reset
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  )
}

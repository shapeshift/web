import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useNavigate } from 'react-router-dom'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { YieldCard, YieldCardSkeleton } from '@/pages/Yields/components/YieldCard'
import { YieldOverview } from '@/pages/Yields/components/YieldOverview'
import { YieldRow, YieldRowSkeleton } from '@/pages/Yields/components/YieldRow'
import { ListHeader, ViewToggle } from '@/pages/Yields/components/YieldViewHelpers'
import { YieldDetail } from '@/pages/Yields/YieldDetail'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'

export const Yields = () => {
  return (
    <Routes>
      <Route index element={<YieldsList />} />
      {/* More specific routes must come BEFORE general :yieldId route */}
      <Route path=':yieldId/enter' element={<YieldDetail />} />
      <Route path=':yieldId/exit' element={<YieldDetail />} />
      <Route path=':yieldId' element={<YieldDetail />} />
    </Routes>
  )
}

const YieldsList = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: yields, isLoading, error } = useYields({ network: 'base' })
  const { data: allBalances, isLoading: isLoadingBalances } = useAllYieldBalances()

  const connectedYields = useMemo(() => {
    if (!isConnected || !yields) return []
    return yields
  }, [isConnected, yields])

  const myPositions = useMemo(() => {
    if (!connectedYields || !allBalances) return []
    return connectedYields.filter(yieldItem => {
      const balances = allBalances[yieldItem.id]
      if (!balances) return false
      // Check if any balance type has > 0 amount
      return balances.some(b => bnOrZero(b.amount).gt(0))
    })
  }, [connectedYields, allBalances])

  const handleYieldClick = (yieldId: string) => {
    navigate(`/yields/${yieldId}`)
  }

  if (!isConnected) {
    return (
      <Container maxW='1200px' py={8}>
        <Box textAlign='center' py={16}>
          <Heading as='h2' size='xl' mb={4}>
            {translate('yieldXYZ.pageTitle')}
          </Heading>
          <Text color='text.subtle' mb={8} maxW='md' mx='auto'>
            {translate('yieldXYZ.connectWallet')}
          </Text>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW='1200px' py={8}>
      <Box mb={8}>
        <Heading as='h2' size='xl' mb={2}>
          {translate('yieldXYZ.pageTitle')}
        </Heading>
        <Text color='text.subtle'>{translate('yieldXYZ.pageSubtitle')}</Text>
      </Box>

      {error && (
        <Box mb={8} p={4} bg='red.900' borderRadius='md'>
          <Text color='red.200'>Error loading yields: {String(error)}</Text>
        </Box>
      )}

      {myPositions.length > 0 && <YieldOverview positions={myPositions} balances={allBalances} />}

      <Tabs variant='soft-rounded' colorScheme='blue' isLazy>
        <TabList mb={6}>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>{translate('common.all')}</Tab>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            {translate('yieldXYZ.myPosition')} ({myPositions.length})
          </Tab>
        </TabList>

        <TabPanels>
          {/* All Yields Tab */}
          <TabPanel px={0}>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

            {viewMode === 'list' && <ListHeader />}

            {viewMode === 'grid' ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <YieldCardSkeleton key={i} />)
                  : connectedYields.map(yieldItem => (
                    <YieldCard
                      key={yieldItem.id}
                      yield={yieldItem}
                      onEnter={() => handleYieldClick(yieldItem.id)}
                    />
                  ))}
              </SimpleGrid>
            ) : (
              <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <YieldRowSkeleton key={i} />)
                  : connectedYields.map(yieldItem => (
                    <YieldRow
                      key={yieldItem.id}
                      yield={yieldItem}
                      onEnter={() => handleYieldClick(yieldItem.id)}
                    />
                  ))}
              </Box>
            )}

            {!isLoading && connectedYields.length === 0 && (
              <Box textAlign='center' py={16}>
                <Text color='text.subtle'>{translate('yieldXYZ.noYields')}</Text>
              </Box>
            )}
          </TabPanel>

          {/* My Positions Tab */}
          <TabPanel px={0}>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

            {viewMode === 'list' && myPositions.length > 0 && <ListHeader />}

            {isLoading || isLoadingBalances ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {Array.from({ length: 3 }).map((_, i) => <YieldCardSkeleton key={i} />)}
              </SimpleGrid>
            ) : myPositions.length > 0 ? (
              viewMode === 'grid' ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {myPositions.map(yieldItem => (
                    <YieldCard
                      key={yieldItem.id}
                      yield={yieldItem}
                      onEnter={() => handleYieldClick(yieldItem.id)}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
                  {myPositions.map(yieldItem => (
                    <YieldRow
                      key={yieldItem.id}
                      yield={yieldItem}
                      onEnter={() => handleYieldClick(yieldItem.id)}
                    />
                  ))}
                </Box>
              )
            ) : (
              <Box textAlign='center' py={16} bg='whiteAlpha.50' borderRadius='xl'>
                <Text color='text.subtle' mb={2}>{translate('yieldXYZ.noYields')}</Text>
                <Text fontSize='sm' color='text.subtle'>You do not have any active yield positions.</Text>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}

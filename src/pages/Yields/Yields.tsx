import { Box, Container, Heading, SimpleGrid, Skeleton, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useNavigate } from 'react-router-dom'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { YieldCard } from '@/pages/Yields/components/YieldCard'
import { YieldDetail } from '@/pages/Yields/YieldDetail'
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

  const { data: yields, isLoading, error } = useYields({ network: 'base' })

  const connectedYields = useMemo(() => {
    if (!isConnected || !yields) return []
    return yields
  }, [isConnected, yields])

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

      {!isLoading && connectedYields.length === 0 && (
        <Box textAlign='center' py={16}>
          <Text color='text.subtle'>{translate('yieldXYZ.noYields')}</Text>
        </Box>
      )}
    </Container>
  )
}

const YieldCardSkeleton = () => (
  <Box borderWidth='1px' borderRadius='lg' overflow='hidden' p={6}>
    <Skeleton height='20px' width='60%' mb={4} />
    <Skeleton height='16px' width='40%' mb={2} />
    <Skeleton height='32px' width='50%' mb={4} />
    <Skeleton height='40px' width='100%' />
  </Box>
)

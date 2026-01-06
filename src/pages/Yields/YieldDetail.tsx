import { Box, Button, Container, Flex, Heading, Text, useColorModeValue } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { YieldEnterExit } from '@/pages/Yields/components/YieldEnterExit'
import { YieldStats } from '@/pages/Yields/components/YieldStats'
import { YieldYourInfo } from '@/pages/Yields/components/YieldYourInfo'
import { useYield } from '@/react-queries/queries/yieldxyz/useYield'

export const YieldDetail = () => {
  const { yieldId } = useParams<{ yieldId: string }>()
  const navigate = useNavigate()
  const translate = useTranslate()

  const { data: yieldItem, isLoading, error } = useYield(yieldId ?? '')

  // Premium dark mode foundation
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.800')

  useEffect(() => {
    if (!yieldId) {
      navigate('/yields')
    }
  }, [yieldId, navigate])

  if (isLoading) {
    return (
      <Container maxW='1200px' py={20}>
        <Flex direction='column' gap={8} alignItems='center'>
          <Text color='text.subtle' fontSize='lg'>
            {translate('common.loadingText')}
          </Text>
        </Flex>
      </Container>
    )
  }

  if (error || !yieldItem) {
    return (
      <Container maxW='1200px' py={20}>
        <Box textAlign='center' py={16} bg='gray.800' borderRadius='2xl'>
          <Heading as='h2' size='xl' mb={4}>
            {translate('common.error')}
          </Heading>
          <Text color='text.subtle'>
            {error ? String(error) : translate('common.noResultsFound')}
          </Text>
          <Button mt={8} onClick={() => navigate('/yields')} size='lg'>
            {translate('common.back')}
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Box bg={bgColor} minH='100vh' pb={20}>
      {/* Header Section */}
      <Box borderBottom='1px' borderColor={borderColor} bg='gray.900' py={8} mb={8}>
        <Container maxW='1200px'>
          <Button
            variant='ghost'
            size='sm'
            leftIcon={<span>←</span>}
            onClick={() => navigate('/yields')}
            mb={6}
            color='text.subtle'
            _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
          >
            {translate('common.back')}
          </Button>

          <Flex alignItems='center' gap={6} mb={4}>
            <Box
              w={16}
              h={16}
              borderRadius='full'
              bg='gray.700'
              backgroundImage={`url(${yieldItem.metadata.logoURI})`}
              backgroundSize='cover'
              backgroundPosition='center'
              boxShadow='xl'
              border='2px solid'
              borderColor='gray.700'
            />
            <Box>
              <Heading as='h1' size='2xl' color='white'>
                {yieldItem.metadata.name}
              </Heading>

              <Flex alignItems='center' gap={3} mt={2}>
                <Box bg='blue.500' w={2} h={2} borderRadius='full' />
                <Text color='blue.200' fontWeight='bold'>
                  {yieldItem.network}
                </Text>
                <Text color='gray.500'>•</Text>
                <Text color='text.subtle'>Provided by {yieldItem.providerId}</Text>
              </Flex>
            </Box>
          </Flex>

          <Text color='text.subtle' fontSize='lg' maxW='container.md'>
            {yieldItem.metadata.description}
          </Text>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxW='1200px'>
        <Flex direction={{ base: 'column', xl: 'row' }} gap={10}>
          {/* Main Column: Enter/Exit + Transaction History */}
          <Box flex={2}>
            <YieldEnterExit yieldItem={yieldItem} />
          </Box>

          {/* Sidebar: Stats + User Info */}
          <Box flex={1} minW={{ base: '100%', xl: '400px' }}>
            <Flex direction='column' gap={8}>
              <YieldYourInfo yieldItem={yieldItem} />
              <YieldStats yieldItem={yieldItem} />
            </Flex>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}

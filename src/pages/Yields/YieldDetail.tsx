import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { FaChevronLeft } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { YieldEnterExit } from '@/pages/Yields/components/YieldEnterExit'
import { YieldPositionCard } from '@/pages/Yields/components/YieldPositionCard'
import { YieldStats } from '@/pages/Yields/components/YieldStats'
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
      <Box borderBottom='1px' borderColor={borderColor} bg='gray.900' py={12} mb={10}>
        <Container maxW='1200px'>
          <Button
            variant='link'
            color='text.subtle'
            leftIcon={<FaChevronLeft />}
            onClick={() => navigate('/yields')}
            mb={8}
            _hover={{ color: 'white', textDecoration: 'none' }}
          >
            {translate('common.back')}
          </Button>

          <Flex alignItems='start' gap={8}>
            <Image
              src={yieldItem.metadata.logoURI}
              w={24}
              h={24}
              borderRadius='full'
              boxShadow='2xl'
              border='4px solid'
              borderColor='gray.800'
              fallbackSrc='https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/eth-icons/eth.png'
            />
            <Box pt={2}>
              <Heading as='h1' size='2xl' color='white' lineHeight='1.2' mb={3}>
                {yieldItem.metadata.name}
              </Heading>

              <Flex alignItems='center' gap={4} mb={4}>
                <Badge
                  colorScheme='blue'
                  variant='solid'
                  fontSize='xs'
                  borderRadius='full'
                  px={3}
                  py={1}
                >
                  {yieldItem.network}
                </Badge>
                <Text color='text.subtle' fontSize='md'>
                  Provided by{' '}
                  <Text as='span' color='white' fontWeight='semibold'>
                    {yieldItem.providerId}
                  </Text>
                </Text>
              </Flex>

              <Text color='gray.400' fontSize='lg' maxW='container.md' lineHeight='short'>
                {yieldItem.metadata.description}
              </Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxW='1200px'>
        <Flex direction={{ base: 'column-reverse', lg: 'row' }} gap={10}>
          {/* Main Column: Enter/Exit */}
          <Box flex={2}>
            <YieldEnterExit yieldItem={yieldItem} />
          </Box>

          {/* Sidebar: Your Position + Stats */}
          <Box flex={1.2} minW={{ base: '100%', lg: '420px' }}>
            <Flex direction='column' gap={6}>
              <YieldPositionCard yieldItem={yieldItem} />
              <YieldStats yieldItem={yieldItem} />
            </Flex>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}

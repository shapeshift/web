import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { FaChevronLeft } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { YieldEnterExit } from '@/pages/Yields/components/YieldEnterExit'
import { YieldPositionCard } from '@/pages/Yields/components/YieldPositionCard'
import { YieldStats } from '@/pages/Yields/components/YieldStats'
import { useYield } from '@/react-queries/queries/yieldxyz/useYield'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'

export const YieldDetail = () => {
  const { yieldId } = useParams<{ yieldId: string }>()
  const navigate = useNavigate()
  const translate = useTranslate()

  const { data: yieldItem, isLoading, isFetching, error } = useYield(yieldId ?? '')
  const { data: yieldProviders } = useYieldProviders()

  const shouldFetchValidators =
    yieldItem?.mechanics.type === 'staking' && yieldItem?.mechanics.requiresValidatorSelection
  const { data: validators } = useYieldValidators(yieldId ?? '', shouldFetchValidators)

  const providerLogo = yieldProviders?.find(p => p.id === yieldItem?.providerId)?.logoURI

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
            {(() => {
              const iconSource = resolveYieldInputAssetIcon(yieldItem)
              return iconSource.assetId ? (
                <AssetIcon
                  assetId={iconSource.assetId}
                  showNetworkIcon={false}
                  boxSize={24}
                  boxShadow='2xl'
                  border='4px solid'
                  borderColor='gray.800'
                  borderRadius='full'
                />
              ) : (
                <AssetIcon
                  src={iconSource.src}
                  boxSize={24}
                  boxShadow='2xl'
                  border='4px solid'
                  borderColor='gray.800'
                  borderRadius='full'
                />
              )
            })()}
            <Box pt={2}>
              <Heading as='h1' size='2xl' color='white' lineHeight='1.2' mb={3}>
                {yieldItem.metadata.name}
              </Heading>

              <Flex alignItems='center' gap={4} mb={2}>
                {shouldFetchValidators && validators && validators.length > 0 ? (
                  <HStack spacing={2}>
                    <AvatarGroup size='xs' max={3}>
                      {validators.map(v => (
                        <Avatar key={v.address} src={v.logoURI} name={v.name} />
                      ))}
                    </AvatarGroup>
                    <Text color='text.subtle' fontSize='md'>
                      <Text as='span' color='white' fontWeight='semibold'>
                        {validators.length > 3 ? `${validators.length} Validators` : 'Validators'}
                      </Text>
                    </Text>
                  </HStack>
                ) : (
                  <HStack spacing={2}>
                    <Avatar src={providerLogo} size='xs' name={yieldItem.providerId} />
                    <Text color='text.subtle' fontSize='md'>
                      <Text as='span' color='white' fontWeight='semibold'>
                        {yieldItem.providerId}
                      </Text>
                    </Text>
                  </HStack>
                )}
              </Flex>

              {yieldItem.chainId && (
                <HStack spacing={2} mb={4}>
                  <ChainIcon chainId={yieldItem.chainId} boxSize='20px' />
                  <Text
                    color='white'
                    fontWeight='semibold'
                    fontSize='md'
                    textTransform='capitalize'
                  >
                    {yieldItem.network}
                  </Text>
                </HStack>
              )}

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
            <YieldEnterExit yieldItem={yieldItem} isQuoteLoading={isFetching} />
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

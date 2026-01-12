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
} from '@chakra-ui/react'
import { memo, useEffect, useMemo } from 'react'
import { FaChevronLeft } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { ValidatorBreakdown } from '@/pages/Yields/components/ValidatorBreakdown'
import { YieldEnterExit } from '@/pages/Yields/components/YieldEnterExit'
import { YieldPositionCard } from '@/pages/Yields/components/YieldPositionCard'
import { YieldStats } from '@/pages/Yields/components/YieldStats'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYield } from '@/react-queries/queries/yieldxyz/useYield'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'

export const YieldDetail = memo(() => {
  const { yieldId } = useParams<{ yieldId: string }>()
  const navigate = useNavigate()
  const translate = useTranslate()

  const { data: yieldItem, isLoading, isFetching, error } = useYield(yieldId ?? '')
  const { data: yieldProviders } = useYieldProviders()

  const shouldFetchValidators = useMemo(
    () =>
      yieldItem?.mechanics.type === 'staking' && yieldItem?.mechanics.requiresValidatorSelection,
    [yieldItem?.mechanics.type, yieldItem?.mechanics.requiresValidatorSelection],
  )
  const { data: validators } = useYieldValidators(yieldId ?? '', shouldFetchValidators)

  const providerLogo = useMemo(
    () =>
      yieldItem?.providerId && yieldProviders
        ? yieldProviders[yieldItem.providerId]?.logoURI
        : undefined,
    [yieldItem?.providerId, yieldProviders],
  )

  const { data: allBalancesData, isFetching: isBalancesFetching } = useAllYieldBalances()
  const balances = yieldItem?.id ? allBalancesData?.normalized[yieldItem.id] : undefined
  const isBalancesLoading = !allBalancesData && isBalancesFetching
  const uniqueValidatorCount = balances?.validatorAddresses.length ?? 0

  useEffect(() => {
    if (!yieldId) navigate('/yields')
  }, [yieldId, navigate])

  const loadingElement = useMemo(
    () => (
      <Container maxW='1200px' py={20}>
        <Flex direction='column' gap={8} alignItems='center'>
          <Text color='text.subtle' fontSize='lg'>
            {translate('common.loadingText')}
          </Text>
        </Flex>
      </Container>
    ),
    [translate],
  )

  const errorElement = useMemo(
    () => (
      <Container maxW='1200px' py={20}>
        <Box textAlign='center' py={16} bg='background.surface.raised.base' borderRadius='2xl'>
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
    ),
    [error, navigate, translate],
  )

  const heroIcon = useMemo(() => {
    if (!yieldItem) return null
    const iconSource = resolveYieldInputAssetIcon(yieldItem)
    const iconProps = {
      showNetworkIcon: false,
      boxSize: { base: 16, md: 24 },
      boxShadow: '2xl',
      border: '4px solid',
      borderColor: 'border.base',
      borderRadius: 'full',
      bg: 'background.surface.base',
    }
    if (iconSource.assetId) return <AssetIcon assetId={iconSource.assetId} {...iconProps} />
    return <AssetIcon src={iconSource.src} {...iconProps} />
  }, [yieldItem])

  const providerOrValidatorsElement = useMemo(() => {
    if (!yieldItem) return null
    if (shouldFetchValidators && validators && validators.length > 0 && uniqueValidatorCount > 1)
      return (
        <HStack spacing={2}>
          <AvatarGroup size='xs' max={3}>
            {validators.map(v => (
              <Avatar key={v.address} src={v.logoURI} name={v.name} />
            ))}
          </AvatarGroup>
          <Text color='text.subtle' fontSize='md'>
            <Text as='span' color='text.base' fontWeight='semibold'>
              {validators.length > 3 ? `${validators.length} Validators` : 'Validators'}
            </Text>
          </Text>
        </HStack>
      )
    return (
      <HStack spacing={2}>
        <Avatar src={providerLogo} size='xs' name={yieldItem.providerId} />
        <Text color='text.subtle' fontSize='md'>
          <Text as='span' color='text.base' fontWeight='semibold'>
            {yieldItem.providerId}
          </Text>
        </Text>
      </HStack>
    )
  }, [providerLogo, shouldFetchValidators, uniqueValidatorCount, validators, yieldItem])

  const chainElement = useMemo(() => {
    if (!yieldItem?.chainId) return null
    return (
      <HStack spacing={2} mb={4}>
        <ChainIcon chainId={yieldItem.chainId} boxSize='20px' />
        <Text color='text.base' fontWeight='semibold' fontSize='md' textTransform='capitalize'>
          {yieldItem.network}
        </Text>
      </HStack>
    )
  }, [yieldItem?.chainId, yieldItem?.network])

  if (isLoading) return loadingElement
  if (error || !yieldItem) return errorElement

  return (
    <Box bg='background.surface.base' minH='100vh' pb={20}>
      <Box py={12} mb={10}>
        <Container maxW='1200px' px={{ base: 4, md: 6 }}>
          <Button
            variant='link'
            color='text.subtle'
            leftIcon={<FaChevronLeft />}
            onClick={() => navigate('/yields')}
            mb={8}
            _hover={{ color: 'text.base', textDecoration: 'none' }}
          >
            {translate('common.back')}
          </Button>
          <Flex
            alignItems={{ base: 'center', md: 'start' }}
            gap={{ base: 4, md: 8 }}
            direction={{ base: 'column', md: 'row' }}
          >
            {heroIcon}
            <Box pt={{ base: 0, md: 2 }} textAlign={{ base: 'center', md: 'left' }}>
              <Heading
                as='h1'
                size={{ base: 'xl', md: '2xl' }}
                color='text.base'
                lineHeight='1.2'
                mb={3}
              >
                {yieldItem.metadata.name}
              </Heading>
              <Flex
                alignItems='center'
                gap={4}
                mb={2}
                justify={{ base: 'center', md: 'flex-start' }}
              >
                {providerOrValidatorsElement}
              </Flex>
              <Flex justify={{ base: 'center', md: 'flex-start' }}>{chainElement}</Flex>
              <Text
                color='text.subtle'
                fontSize={{ base: 'md', md: 'lg' }}
                maxW='container.md'
                lineHeight='short'
              >
                {yieldItem.metadata.description}
              </Text>
            </Box>
          </Flex>
        </Container>
      </Box>
      <Container maxW='1200px' px={{ base: 4, md: 6 }}>
        <Flex direction={{ base: 'column-reverse', lg: 'row' }} gap={10}>
          <Box flex={2}>
            <YieldEnterExit
              yieldItem={yieldItem}
              isQuoteLoading={isFetching}
              balances={balances}
              isBalancesLoading={isBalancesLoading}
            />
          </Box>
          <Box flex={1.2} minW={{ base: '100%', lg: '420px' }}>
            <Flex direction='column' gap={6}>
              <YieldPositionCard
                yieldItem={yieldItem}
                balances={balances}
                isBalancesLoading={isBalancesLoading}
              />
              <ValidatorBreakdown
                yieldItem={yieldItem}
                balances={balances}
                isBalancesLoading={isBalancesLoading}
              />
              <YieldStats yieldItem={yieldItem} balances={balances} />
            </Flex>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
})

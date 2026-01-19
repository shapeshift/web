import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Card,
  CardBody,
  Flex,
  HStack,
  SimpleGrid,
  Skeleton,
  SkeletonCircle,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import type BigNumber from 'bignumber.js'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getYieldDisplayName } from '@/lib/yieldxyz/getYieldDisplayName'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SingleYieldData = {
  type: 'single'
  yieldItem: AugmentedYieldDto
  providerIcon?: string
  providerName?: string
}

type GroupYieldData = {
  type: 'group'
  assetSymbol: string
  assetName: string
  assetIcon: string
  assetId?: string
  yields: AugmentedYieldDto[]
}

type YieldItemProps = {
  data: SingleYieldData | GroupYieldData
  variant: 'card' | 'row' | 'mobile'
  userBalanceUsd?: BigNumber
  availableBalanceUserCurrency?: BigNumber
  onEnter?: (yieldItem: AugmentedYieldDto) => void
  searchString?: string
  titleOverride?: string
  showAvailableOnly?: boolean
}

export const YieldItem = memo(
  ({
    data,
    variant,
    userBalanceUsd,
    availableBalanceUserCurrency,
    onEnter,
    searchString,
    titleOverride,
    showAvailableOnly = false,
  }: YieldItemProps) => {
    const navigate = useNavigate()
    const translate = useTranslate()
    const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
    const { data: yieldProviders } = useYieldProviders()

    const isSingle = data.type === 'single'
    const isGroup = data.type === 'group'

    const stats = (() => {
      if (isSingle) {
        const y = data.yieldItem
        return {
          apy: y.rewardRate.total,
          apyLabel: y.rewardRate.rateType,
          tvlUsd: y.statistics?.tvlUsd ?? '0',
          providers: [{ id: y.providerId, logo: data.providerIcon }],
          chainIds: y.chainId ? [y.chainId] : [],
          count: 1,
          name: y.metadata.name,
          canEnter: y.status.enter,
        }
      }
      const yields = data.yields
      const maxApy = Math.max(0, ...yields.map(y => y.rewardRate.total))
      const totalTvlUsd = yields
        .reduce((acc, y) => acc.plus(bnOrZero(y.statistics?.tvlUsd)), bnOrZero(0))
        .toFixed()
      const providerIds = [...new Set(yields.map(y => y.providerId))]
      const chainIds = [...new Set(yields.map(y => y.chainId).filter(Boolean))] as string[]

      return {
        apy: maxApy,
        apyLabel: 'APY',
        tvlUsd: totalTvlUsd,
        providers: providerIds.map(id => ({ id, logo: yieldProviders?.[id]?.logoURI })),
        chainIds,
        count: yields.length,
        name: data.assetName,
        canEnter: true,
      }
    })()

    const apyFormatted = `${(stats.apy * 100).toFixed(2)}%`
    const tvlUserCurrency = bnOrZero(stats.tvlUsd).times(userCurrencyToUsdRate).toFixed()
    const userBalanceUserCurrency = userBalanceUsd
      ? userBalanceUsd.times(userCurrencyToUsdRate).toFixed()
      : undefined

    const hasBalance = userBalanceUsd && userBalanceUsd.gt(0) && !showAvailableOnly
    const hasAvailable = availableBalanceUserCurrency && availableBalanceUserCurrency.gt(0)

    const handleClick = useCallback(() => {
      if (isSingle) {
        if (stats.canEnter && onEnter) {
          onEnter(data.yieldItem)
        } else {
          navigate(`/yields/${data.yieldItem.id}`)
        }
      } else {
        const suffix = searchString ? `?${searchString}` : ''
        navigate(`/yields/asset/${encodeURIComponent(data.assetSymbol)}${suffix}`)
      }
    }, [data, isSingle, navigate, onEnter, searchString, stats.canEnter])

    const iconElement = (() => {
      if (isSingle) {
        const iconSource = resolveYieldInputAssetIcon(data.yieldItem)
        const size = variant === 'card' ? 'md' : 'sm'
        if (iconSource.assetId) {
          return <AssetIcon assetId={iconSource.assetId} size={size} />
        }
        return <AssetIcon src={iconSource.src} size={size} />
      }
      const size = variant === 'card' ? 'md' : 'sm'
      if (data.assetId) {
        return <AssetIcon assetId={data.assetId} size={size} showNetworkIcon={false} />
      }
      return <AssetIcon src={data.assetIcon} size={size} />
    })()

    const subtitle = isSingle
      ? data.providerName ?? data.yieldItem.providerId
      : `${stats.count} ${
          stats.count === 1 ? translate('yieldXYZ.market') : translate('yieldXYZ.markets')
        }`

    const title =
      titleOverride ?? (isSingle ? getYieldDisplayName(data.yieldItem) : data.assetSymbol)

    const underMaintenance = isSingle ? data.yieldItem.metadata.underMaintenance : undefined
    const deprecated = isSingle ? data.yieldItem.metadata.deprecated : undefined

    const statusBadge = (() => {
      if (!isSingle) return null
      if (deprecated) {
        return (
          <Tooltip label={translate('yieldXYZ.deprecatedDescription')} hasArrow>
            <Badge colorScheme='red' fontSize='xs' variant='subtle'>
              {translate('yieldXYZ.deprecated')}
            </Badge>
          </Tooltip>
        )
      }
      if (underMaintenance) {
        return (
          <Tooltip label={translate('yieldXYZ.underMaintenanceDescription')} hasArrow>
            <Badge colorScheme='orange' fontSize='xs' variant='subtle'>
              {translate('yieldXYZ.underMaintenance')}
            </Badge>
          </Tooltip>
        )
      }
      return null
    })()

    const showAvailable = isSingle && hasAvailable && !hasBalance

    const cardStatElement = (() => {
      if (hasBalance) {
        return (
          <>
            <StatLabel fontSize='xs' color='text.subtle'>
              {translate('yieldXYZ.balance')}
            </StatLabel>
            <StatNumber fontSize='lg' fontWeight='bold' color='blue.400'>
              <Amount.Fiat value={userBalanceUserCurrency ?? '0'} abbreviated />
            </StatNumber>
          </>
        )
      }
      if (showAvailable) {
        return (
          <>
            <StatLabel fontSize='xs' color='text.subtle'>
              {translate('common.available')}
            </StatLabel>
            <StatNumber fontSize='lg' fontWeight='bold' color='green.400'>
              <Amount.Fiat value={availableBalanceUserCurrency?.toFixed() ?? '0'} abbreviated />
            </StatNumber>
          </>
        )
      }
      return (
        <>
          <StatLabel fontSize='xs' color='text.subtle'>
            {translate('yieldXYZ.tvl')}
          </StatLabel>
          <StatNumber fontSize='md' fontWeight='semibold'>
            <Amount.Fiat value={tvlUserCurrency} abbreviated />
          </StatNumber>
        </>
      )
    })()

    const showAvailableInRow = isSingle && hasAvailable

    const mobileBalanceLabelKey = (() => {
      if (hasBalance) return 'yieldXYZ.balance'
      if (showAvailable) return 'common.available'
      return 'yieldXYZ.balance'
    })()

    const mobileBalanceElement = (() => {
      if (hasBalance) {
        return (
          <Text fontWeight='medium' color='blue.400'>
            <Amount.Fiat value={userBalanceUserCurrency ?? '0'} abbreviated />
          </Text>
        )
      }
      if (showAvailable) {
        return (
          <Text fontWeight='medium' color='green.400'>
            <Amount.Fiat value={availableBalanceUserCurrency?.toFixed() ?? '0'} abbreviated />
          </Text>
        )
      }
      return (
        <Text fontWeight='medium' color='text.subtle'>
          —
        </Text>
      )
    })()

    const rowBalanceElement = (() => {
      if (hasBalance && showAvailableInRow) {
        return (
          <Box>
            <Flex justifyContent='flex-end' gap={1} alignItems='baseline'>
              <Text fontSize='sm' fontWeight='bold' color='blue.400'>
                <Amount.Fiat value={userBalanceUserCurrency ?? '0'} abbreviated />
              </Text>
              <Text fontSize='xs' color='text.subtle'>
                {translate('yieldXYZ.balance').toLowerCase()}
              </Text>
            </Flex>
            <Flex justifyContent='flex-end' gap={1} alignItems='baseline'>
              <Text fontSize='sm' fontWeight='semibold' color='green.400'>
                <Amount.Fiat value={availableBalanceUserCurrency?.toFixed() ?? '0'} abbreviated />
              </Text>
              <Text fontSize='xs' color='text.subtle'>
                {translate('common.available').toLowerCase()}
              </Text>
            </Flex>
          </Box>
        )
      }
      if (hasBalance) {
        return (
          <Text fontSize='sm' fontWeight='bold' color='blue.400'>
            <Amount.Fiat value={userBalanceUserCurrency ?? '0'} abbreviated />
          </Text>
        )
      }
      if (showAvailableInRow) {
        return (
          <>
            <Text fontSize='xs' color='text.subtle'>
              {translate('common.available')}
            </Text>
            <Text fontSize='sm' fontWeight='bold' color='green.400'>
              <Amount.Fiat value={availableBalanceUserCurrency?.toFixed() ?? '0'} abbreviated />
            </Text>
          </>
        )
      }
      return (
        <Text fontSize='sm' color='text.subtle'>
          —
        </Text>
      )
    })()

    if (variant === 'mobile') {
      return (
        <Card
          variant='dashboard'
          cursor='pointer'
          onClick={handleClick}
          borderWidth='1px'
          borderColor='border.base'
          boxShadow='none'
          _hover={{ bg: 'background.surface.raised.base' }}
        >
          <CardBody p={2}>
            <Flex alignItems='center' gap={2} mb={2}>
              {iconElement}
              <HStack spacing={2} flex={1}>
                <Text fontWeight='bold' fontSize='md' lineHeight='1.2' noOfLines={1}>
                  {title}
                </Text>
                {statusBadge}
              </HStack>
            </Flex>

            <SimpleGrid columns={3} spacing={2}>
              <Box>
                <Text
                  fontSize='xs'
                  color='text.subtle'
                  fontWeight='bold'
                  noOfLines={1}
                  mb={0}
                  textTransform='uppercase'
                >
                  {translate(mobileBalanceLabelKey)}
                </Text>
                {mobileBalanceElement}
              </Box>
              <Box>
                <Text
                  fontSize='xs'
                  color='text.subtle'
                  fontWeight='bold'
                  noOfLines={1}
                  mb={0}
                  textTransform='uppercase'
                >
                  {translate('yieldXYZ.tvl')}
                </Text>
                <Text fontWeight='medium'>
                  <Amount.Fiat value={tvlUserCurrency} abbreviated />
                </Text>
              </Box>
              <Box textAlign='right'>
                <Text
                  fontSize='xs'
                  color='text.subtle'
                  fontWeight='bold'
                  noOfLines={1}
                  mb={0}
                  textTransform='uppercase'
                >
                  {isGroup ? translate('yieldXYZ.maxApy') : translate('yieldXYZ.apy')}
                </Text>
                <GradientApy fontWeight='medium' justifyContent='flex-end'>
                  {apyFormatted}
                </GradientApy>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>
      )
    }

    if (variant === 'row') {
      return (
        <Box
          onClick={handleClick}
          cursor='pointer'
          _hover={{ bg: 'background.surface.raised.base' }}
          borderBottomWidth='1px'
          borderColor='border.base'
          transition='background 0.2s'
        >
          <Flex p={4} alignItems='center' gap={4}>
            <Flex alignItems='center' gap={3} flex='1' minW='200px'>
              {iconElement}
              <Box>
                <HStack spacing={2}>
                  <Text fontWeight='bold' fontSize='sm'>
                    {title}
                  </Text>
                  {statusBadge}
                </HStack>
                <Text fontSize='xs' color='text.subtle' textTransform='capitalize'>
                  {subtitle}
                </Text>
              </Box>
            </Flex>
            <Flex gap={8} alignItems='center' flex='2'>
              <Box minW='100px'>
                <Text fontSize='xs' color='text.subtle'>
                  {isGroup ? translate('yieldXYZ.maxApy') : translate('yieldXYZ.apy')}
                </Text>
                <Text fontWeight='bold' color='green.400' fontSize='sm'>
                  {apyFormatted}
                </Text>
              </Box>
              <Box minW='120px' display={{ base: 'none', md: 'block' }}>
                <Text fontSize='xs' color='text.subtle'>
                  {translate('yieldXYZ.tvl')}
                </Text>
                <Text fontSize='sm'>
                  <Amount.Fiat value={tvlUserCurrency} abbreviated />
                </Text>
              </Box>
              <Box minW='120px' display={{ base: 'none', lg: 'block' }}>
                {isGroup ? (
                  <AvatarGroup size='xs' max={4}>
                    {stats.providers.map(p => (
                      <Avatar key={p.id} src={p.logo} name={p.id} />
                    ))}
                  </AvatarGroup>
                ) : (
                  <AvatarGroup size='xs' max={1}>
                    {stats.providers.slice(0, 1).map(p => (
                      <Avatar key={p.id} src={p.logo} name={p.id} />
                    ))}
                  </AvatarGroup>
                )}
              </Box>
              <Box flex='1' display={{ base: 'none', md: 'block' }} textAlign='right'>
                {rowBalanceElement}
              </Box>
            </Flex>
          </Flex>
        </Box>
      )
    }

    return (
      <Card
        variant='dashboard'
        cursor={stats.canEnter ? 'pointer' : 'default'}
        onClick={handleClick}
        transition='all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        _hover={{
          borderColor: 'blue.500',
          transform: 'translateY(-2px)',
        }}
        position='relative'
        display='flex'
        flexDir='column'
      >
        <CardBody p={5} display='flex' flexDir='column' flex={1}>
          <Flex justifyContent='space-between' alignItems='flex-start' mb={6}>
            <Flex alignItems='center' gap={4}>
              {iconElement}
              <Box>
                <Text
                  fontWeight='bold'
                  fontSize='md'
                  noOfLines={1}
                  maxW='200px'
                  lineHeight='1.2'
                  mb={1}
                >
                  {title}
                </Text>
                <Flex alignItems='center' gap={2}>
                  {isSingle && data.providerIcon && (
                    <Box
                      as='img'
                      src={data.providerIcon}
                      w={4}
                      h={4}
                      borderRadius='full'
                      title={subtitle}
                    />
                  )}
                  <Text fontSize='xs' color='text.subtle' textTransform='capitalize'>
                    {subtitle}
                  </Text>
                </Flex>
              </Box>
            </Flex>
            {statusBadge}
          </Flex>

          <HStack spacing={6} justify='space-between' mt='auto'>
            <Stat size='sm'>
              <StatLabel fontSize='xs' color='text.subtle'>
                {isGroup
                  ? translate('yieldXYZ.maxApy')
                  : `${translate('yieldXYZ.apy')} (${stats.apyLabel})`}
              </StatLabel>
              <StatNumber
                fontSize='xl'
                fontWeight='bold'
                bgGradient='linear(to-r, green.300, blue.400)'
                bgClip='text'
                lineHeight='1'
              >
                {apyFormatted}
              </StatNumber>
            </Stat>
            <Stat size='sm' textAlign='right'>
              {cardStatElement}
            </Stat>
          </HStack>
        </CardBody>
      </Card>
    )
  },
)

export const YieldItemSkeleton = memo(({ variant }: { variant: 'card' | 'row' | 'mobile' }) => {
  if (variant === 'mobile') {
    return (
      <Card variant='dashboard' mb={3} boxShadow='none' borderWidth='1px'>
        <CardBody p={4}>
          <Flex alignItems='center' justify='space-between'>
            <Flex alignItems='center' gap={3}>
              <SkeletonCircle size='10' />
              <Box>
                <Skeleton height='16px' width='80px' mb={1} />
                <Skeleton height='12px' width='120px' />
              </Box>
            </Flex>
            <Skeleton height='12px' width='12px' />
          </Flex>
        </CardBody>
      </Card>
    )
  }

  if (variant === 'row') {
    return (
      <Flex
        borderBottomWidth='1px'
        borderColor='border.base'
        py={3}
        px={4}
        alignItems='center'
        gap={4}
      >
        <Flex alignItems='center' gap={3} flex='1' minW='200px'>
          <SkeletonCircle size='8' />
          <Box>
            <Skeleton height='14px' width='100px' mb={1} />
            <Skeleton height='12px' width='50px' />
          </Box>
        </Flex>
        <Skeleton height='14px' width='60px' display={{ base: 'none', md: 'block' }} />
        <Skeleton height='14px' width='70px' display={{ base: 'none', md: 'block' }} />
        <Skeleton height='14px' width='80px' display={{ base: 'none', lg: 'block' }} />
      </Flex>
    )
  }

  return (
    <Card variant='dashboard'>
      <CardBody p={5}>
        <Flex alignItems='center' gap={4} mb={6}>
          <SkeletonCircle size='12' />
          <Box>
            <Skeleton height='16px' width='120px' mb={2} />
            <Skeleton height='12px' width='60px' />
          </Box>
        </Flex>
        <HStack spacing={6} justify='space-between'>
          <Box>
            <Skeleton height='12px' width='50px' mb={2} />
            <Skeleton height='24px' width='80px' />
          </Box>
          <Box textAlign='right'>
            <Skeleton height='12px' width='30px' mb={2} ml='auto' />
            <Skeleton height='20px' width='60px' ml='auto' />
          </Box>
        </HStack>
      </CardBody>
    </Card>
  )
})

import {
  Avatar,
  AvatarGroup,
  Box,
  Card,
  CardBody,
  Flex,
  HStack,
  Skeleton,
  SkeletonCircle,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import type BigNumber from 'bignumber.js'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SingleYieldData = {
  type: 'single'
  yieldItem: AugmentedYieldDto
  providerIcon?: string
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
  variant: 'card' | 'row'
  userBalanceUsd?: BigNumber
  onEnter?: (yieldItem: AugmentedYieldDto) => void
}

export const YieldItem = memo(({ data, variant, userBalanceUsd, onEnter }: YieldItemProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const { data: yieldProviders } = useYieldProviders()

  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const cardBg = useColorModeValue('white', 'gray.800')
  const hoverBorderColor = useColorModeValue('blue.500', 'blue.400')
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const cardShadow = useColorModeValue('sm', 'none')
  const cardHoverShadow = useColorModeValue('lg', 'lg')

  const isSingle = data.type === 'single'
  const isGroup = data.type === 'group'

  const stats = useMemo(() => {
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
  }, [data, isSingle, yieldProviders])

  const apyFormatted = useMemo(() => `${(stats.apy * 100).toFixed(2)}%`, [stats.apy])

  const tvlUserCurrency = useMemo(
    () => bnOrZero(stats.tvlUsd).times(userCurrencyToUsdRate).toFixed(),
    [stats.tvlUsd, userCurrencyToUsdRate],
  )

  const userBalanceUserCurrency = useMemo(
    () => (userBalanceUsd ? userBalanceUsd.times(userCurrencyToUsdRate).toFixed() : undefined),
    [userBalanceUsd, userCurrencyToUsdRate],
  )

  const hasBalance = userBalanceUsd && userBalanceUsd.gt(0)

  const handleClick = useCallback(() => {
    if (isSingle) {
      if (stats.canEnter && onEnter) {
        onEnter(data.yieldItem)
      } else {
        navigate(`/yields/${data.yieldItem.id}`)
      }
    } else {
      navigate(`/yields/asset/${encodeURIComponent(data.assetSymbol)}`)
    }
  }, [data, isSingle, navigate, onEnter, stats.canEnter])

  const iconElement = useMemo(() => {
    if (isSingle) {
      const iconSource = resolveYieldInputAssetIcon(data.yieldItem)
      const size = variant === 'card' ? 'md' : 'sm'
      if (iconSource.assetId) {
        return (
          <AssetIcon
            assetId={iconSource.assetId}
            size={size}
            boxShadow={variant === 'card' ? 'md' : undefined}
            borderWidth={variant === 'card' ? '1px' : undefined}
            borderColor={borderColor}
          />
        )
      }
      return (
        <AssetIcon
          src={iconSource.src}
          size={size}
          boxShadow={variant === 'card' ? 'md' : undefined}
          borderWidth={variant === 'card' ? '1px' : undefined}
          borderColor={borderColor}
        />
      )
    }
    const size = variant === 'card' ? 'md' : 'sm'
    if (data.assetId) {
      return (
        <AssetIcon
          assetId={data.assetId}
          size={size}
          showNetworkIcon={false}
          boxShadow={variant === 'card' ? 'md' : undefined}
          borderWidth={variant === 'card' ? '1px' : undefined}
          borderColor={borderColor}
        />
      )
    }
    return (
      <AssetIcon
        src={data.assetIcon}
        size={size}
        boxShadow={variant === 'card' ? 'md' : undefined}
        borderWidth={variant === 'card' ? '1px' : undefined}
        borderColor={borderColor}
      />
    )
  }, [data, isSingle, variant, borderColor])

  const subtitle = useMemo(() => {
    if (isSingle) {
      return data.yieldItem.providerId
    }
    return `${stats.count} ${
      stats.count === 1 ? translate('yieldXYZ.market') : translate('yieldXYZ.markets')
    }`
  }, [data, isSingle, stats.count, translate])

  const title = useMemo(() => {
    if (isSingle) return data.yieldItem.metadata.name
    return data.assetSymbol
  }, [data, isSingle])

  if (variant === 'row') {
    return (
      <Box
        onClick={handleClick}
        cursor='pointer'
        _hover={{ bg: hoverBg }}
        borderBottomWidth='1px'
        borderColor='inherit'
        transition='background 0.2s'
      >
        <Flex p={4} alignItems='center' gap={4}>
          <Flex alignItems='center' gap={3} flex='1' minW='200px'>
            {iconElement}
            <Box>
              <Text fontWeight='bold' fontSize='sm'>
                {title}
              </Text>
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
            {hasBalance && (
              <Box minW='120px' display={{ base: 'none', md: 'block' }}>
                <Text fontSize='sm' fontWeight='bold' color='blue.400'>
                  <Amount.Fiat value={userBalanceUserCurrency ?? '0'} abbreviated />
                </Text>
              </Box>
            )}
            {isGroup && (
              <Box flex='1' display={{ base: 'none', lg: 'block' }}>
                <AvatarGroup size='xs' max={4}>
                  {stats.providers.map(p => (
                    <Avatar key={p.id} src={p.logo} name={p.id} />
                  ))}
                </AvatarGroup>
              </Box>
            )}
          </Flex>
        </Flex>
      </Box>
    )
  }

  return (
    <Card
      bg={cardBg}
      borderWidth='1px'
      borderColor={borderColor}
      boxShadow={cardShadow}
      cursor={stats.canEnter ? 'pointer' : 'default'}
      onClick={handleClick}
      transition='all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      _hover={{
        borderColor: hoverBorderColor,
        transform: 'translateY(-2px)',
        boxShadow: cardHoverShadow,
      }}
      borderRadius='xl'
      variant='outline'
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
        </Flex>

        <HStack spacing={6} justify='space-between' mt='auto'>
          <Stat size='sm'>
            <StatLabel fontSize='xs' color='text.subtle'>
              {isGroup
                ? translate('yieldXYZ.maxApy')
                : `${translate('yieldXYZ.apy')} (${stats.apyLabel})`}
            </StatLabel>
            <StatNumber
              fontSize={isSingle ? '3xl' : 'xl'}
              fontWeight={isSingle ? '800' : 'bold'}
              bgGradient='linear(to-r, green.300, blue.400)'
              bgClip='text'
              lineHeight='1'
            >
              {apyFormatted}
            </StatNumber>
          </Stat>
          <Stat size='sm' textAlign='right'>
            {hasBalance ? (
              <StatNumber fontSize='lg' fontWeight='bold' color='blue.400'>
                <Amount.Fiat value={userBalanceUserCurrency ?? '0'} abbreviated />
              </StatNumber>
            ) : (
              <>
                <StatLabel fontSize='xs' color='text.subtle'>
                  {translate('yieldXYZ.tvl')}
                </StatLabel>
                <StatNumber fontSize='md' fontWeight='semibold'>
                  <Amount.Fiat value={tvlUserCurrency} abbreviated />
                </StatNumber>
              </>
            )}
          </Stat>
        </HStack>

        {isGroup && (
          <Box mt={4} pt={4} borderTopWidth='1px' borderColor={borderColor}>
            <Flex justify='space-between' mb={2}>
              <Box>
                <Text fontSize='xs' color='text.subtle' mb={1}>
                  {stats.providers.length}{' '}
                  {stats.providers.length === 1
                    ? translate('yieldXYZ.protocol')
                    : translate('yieldXYZ.protocols')}
                </Text>
                <AvatarGroup size='xs' max={5} spacing={-1}>
                  {stats.providers.map(p => (
                    <Avatar key={p.id} src={p.logo} name={p.id} />
                  ))}
                </AvatarGroup>
              </Box>
              <Box textAlign='right'>
                <Text fontSize='xs' color='text.subtle' mb={1}>
                  {stats.chainIds.length}{' '}
                  {stats.chainIds.length === 1
                    ? translate('yieldXYZ.chain')
                    : translate('yieldXYZ.chains')}
                </Text>
                <HStack spacing={-1} justify='flex-end'>
                  {stats.chainIds.slice(0, 5).map(chainId => (
                    <ChainIcon key={chainId} chainId={chainId} boxSize='20px' />
                  ))}
                </HStack>
              </Box>
            </Flex>
          </Box>
        )}
      </CardBody>
    </Card>
  )
})

export const YieldItemSkeleton = memo(({ variant }: { variant: 'card' | 'row' }) => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const cardBg = useColorModeValue('white', 'gray.800')

  if (variant === 'row') {
    return (
      <Flex
        borderBottomWidth='1px'
        borderColor={borderColor}
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
    <Card
      bg={cardBg}
      borderWidth='1px'
      borderColor={borderColor}
      borderRadius='xl'
      variant='outline'
    >
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

import {
  Avatar,
  AvatarGroup,
  Box,
  Flex,
  HStack,
  Skeleton,
  SkeletonCircle,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatLargeNumber } from '@/lib/utils/formatters'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'

type YieldAssetGroupRowProps = {
  assetSymbol: string
  assetName: string
  assetIcon: string
  yields: AugmentedYieldDto[]
}

export const YieldAssetGroupRow = ({
  assetSymbol,
  assetName,
  assetIcon,
  yields,
}: YieldAssetGroupRowProps) => {
  const navigate = useNavigate()
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100')
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')

  const { data: yieldProviders } = useYieldProviders()

  const stats = useMemo(() => {
    let maxApy = 0
    let totalTvl = bnOrZero(0)
    const providerIds = new Set<string>()
    const chainIdSet = new Set<string>()

    yields.forEach(y => {
      const apy = y.rewardRate.total
      if (apy > maxApy) maxApy = apy
      totalTvl = totalTvl.plus(bnOrZero(y.statistics?.tvlUsd))
      providerIds.add(y.providerId)
      if (y.chainId) chainIdSet.add(y.chainId)
    })

    const providers = Array.from(providerIds).map(id => ({
      id,
      logo: yieldProviders?.find(p => p.id === id)?.logoURI,
    }))

    const chainIds = Array.from(chainIdSet)

    return {
      maxApy,
      totalTvl,
      providers,
      chainIds,
      count: yields.length,
    }
  }, [yields, yieldProviders])

  const handleClick = () => {
    navigate(`/yields/asset/${encodeURIComponent(assetSymbol)}`)
  }

  return (
    <Flex
      borderBottomWidth='1px'
      borderColor={borderColor}
      _hover={{ bg: hoverBg }}
      cursor='pointer'
      onClick={handleClick}
      py={3}
      px={4}
      alignItems='center'
      gap={4}
    >
      <Flex alignItems='center' gap={3} flex='1' minW='200px'>
        <AssetIcon src={assetIcon} size='sm' />
        <Box>
          <Text fontWeight='semibold' fontSize='sm'>
            {assetName}
          </Text>
          <Text fontSize='xs' color='text.subtle'>
            {stats.count} {stats.count === 1 ? 'market' : 'markets'}
          </Text>
        </Box>
      </Flex>

      <Text
        fontWeight='semibold'
        fontSize='sm'
        color='green.400'
        w='80px'
        display={{ base: 'none', md: 'block' }}
      >
        {stats.maxApy > 0 ? `${(stats.maxApy * 100).toFixed(2)}%` : 'N/A'}
      </Text>

      <Text fontWeight='medium' fontSize='sm' w='90px' display={{ base: 'none', md: 'block' }}>
        {formatLargeNumber(stats.totalTvl.toNumber(), '$')}
      </Text>

      <HStack spacing={1} w='100px' display={{ base: 'none', lg: 'flex' }}>
        <AvatarGroup size='2xs' max={3} spacing={-1}>
          {stats.providers.map(p => (
            <Avatar key={p.id} src={p.logo} name={p.id} />
          ))}
        </AvatarGroup>
        {stats.providers.length > 3 && (
          <Text fontSize='xs' color='text.subtle'>
            +{stats.providers.length - 3}
          </Text>
        )}
      </HStack>

      <HStack spacing={1} w='100px' display={{ base: 'none', lg: 'flex' }}>
        <HStack spacing={-1}>
          {stats.chainIds.slice(0, 3).map(chainId => (
            <ChainIcon key={chainId} chainId={chainId} boxSize='16px' />
          ))}
        </HStack>
        {stats.chainIds.length > 3 && (
          <Text fontSize='xs' color='text.subtle'>
            +{stats.chainIds.length - 3}
          </Text>
        )}
      </HStack>
    </Flex>
  )
}

export const YieldAssetGroupRowSkeleton = () => {
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100')
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
      <Skeleton height='14px' width='80px' display={{ base: 'none', lg: 'block' }} />
    </Flex>
  )
}

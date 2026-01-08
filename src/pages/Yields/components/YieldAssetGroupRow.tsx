import {
  Avatar,
  AvatarGroup,
  Box,
  Flex,
  Skeleton,
  SkeletonCircle,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import type BigNumber from 'bignumber.js'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
// ... existing imports ...

type YieldAssetGroupRowProps = {
  assetSymbol: string
  assetName: string
  assetIcon: string
  assetId?: string
  yields: AugmentedYieldDto[]
  userGroupBalanceUsd?: BigNumber
}

export const YieldAssetGroupRow = ({
  assetSymbol,
  assetName,
  assetIcon,
  assetId,
  yields,
  userGroupBalanceUsd,
}: YieldAssetGroupRowProps) => {
  const navigate = useNavigate()
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const { data: yieldProviders } = useYieldProviders()

  const stats = useMemo(() => {
    let maxApy = 0
    let totalTvl = bnOrZero(0)
    const providerIds = new Set<string>()

    yields.forEach(y => {
      const apy = y.rewardRate.total
      if (apy > maxApy) maxApy = apy
      totalTvl = totalTvl.plus(bnOrZero(y.statistics?.tvlUsd))
      providerIds.add(y.providerId)
    })

    const providers = Array.from(providerIds).map(id => ({
      id,
      logo: yieldProviders?.[id]?.logoURI,
    }))

    return {
      maxApy,
      totalTvl,
      providers,
      count: yields.length,
    }
  }, [yields, yieldProviders])

  return (
    <Box
      onClick={() => navigate(`/yields/asset/${assetSymbol}`)}
      cursor='pointer'
      _hover={{ bg: hoverBg }}
      borderBottomWidth='1px'
      borderColor='inherit'
      transition='background 0.2s'
    >
      <Flex p={4} alignItems='center' gap={4}>
        <Flex alignItems='center' gap={3} flex='1' minW='200px'>
          {assetId ? (
            <AssetIcon assetId={assetId} size='sm' showNetworkIcon={false} />
          ) : (
            <AssetIcon src={assetIcon} size='sm' />
          )}
          <Box>
            <Text fontWeight='bold' fontSize='sm'>
              {assetName}
            </Text>
            <Text fontSize='xs' color='text.subtle'>
              {stats.count} opportunities
            </Text>
          </Box>
        </Flex>

        <Flex gap={8} alignItems='center' flex='2'>
          <Box minW='100px'>
            <Text fontSize='xs' color='text.subtle'>
              Max APY
            </Text>
            <Text fontWeight='bold' color='green.400' fontSize='sm'>
              {stats.maxApy > 0 ? `${(stats.maxApy * 100).toFixed(2)}%` : '0.00%'}
            </Text>
          </Box>

          <Box minW='120px' display={{ base: 'none', md: 'block' }}>
            <Text fontSize='xs' color='text.subtle'>
              TVL
            </Text>
            <Text fontSize='sm'>
              <Amount.Fiat value={stats.totalTvl.toFixed()} abbreviated />
            </Text>
          </Box>

          {userGroupBalanceUsd && userGroupBalanceUsd.gt(0) && (
            <Box minW='120px' display={{ base: 'none', md: 'block' }}>
              <Text fontSize='xs' color='text.subtle'>
                My Balance
              </Text>
              <Text fontSize='sm' fontWeight='bold' color='blue.400'>
                <Amount.Fiat value={userGroupBalanceUsd.toFixed()} abbreviated />
              </Text>
            </Box>
          )}

          <Box flex='1' display={{ base: 'none', lg: 'block' }}>
            <AvatarGroup size='xs' max={4}>
              {stats.providers.map(p => (
                <Avatar key={p.id} src={p.logo} name={p.id} />
              ))}
            </AvatarGroup>
          </Box>
        </Flex>
      </Flex>
    </Box>
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

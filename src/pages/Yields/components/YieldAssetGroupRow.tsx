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
import { memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldAssetGroupRowProps = {
  assetSymbol: string
  assetName: string
  assetIcon: string
  assetId?: string
  yields: AugmentedYieldDto[]
  userGroupBalanceUsd?: BigNumber
}

export const YieldAssetGroupRow = memo(
  ({
    assetSymbol,
    assetName,
    assetIcon,
    assetId,
    yields,
    userGroupBalanceUsd,
  }: YieldAssetGroupRowProps) => {
    const navigate = useNavigate()
    const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')
    const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
    const { data: yieldProviders } = useYieldProviders()

    const stats = useMemo(() => {
      const maxApy = Math.max(...yields.map(y => y.rewardRate.total))

      const totalTvlUsd = yields.reduce(
        (acc, y) => acc.plus(bnOrZero(y.statistics?.tvlUsd)),
        bnOrZero(0),
      )

      const providerIds = [...new Set(yields.map(y => y.providerId))]
      const providers = providerIds.map(id => ({
        id,
        logo: yieldProviders?.[id]?.logoURI,
      }))

      const totalTvlUserCurrency = totalTvlUsd.times(userCurrencyToUsdRate).toFixed()

      return {
        maxApy,
        totalTvlUserCurrency,
        providers,
        count: yields.length,
      }
    }, [yields, yieldProviders, userCurrencyToUsdRate])

    const userGroupBalanceUserCurrency = useMemo(() => {
      if (!userGroupBalanceUsd) return undefined
      return userGroupBalanceUsd.times(userCurrencyToUsdRate).toFixed()
    }, [userGroupBalanceUsd, userCurrencyToUsdRate])

    const handleClick = useCallback(() => {
      navigate(`/yields/asset/${assetSymbol}`)
    }, [navigate, assetSymbol])

    const maxApyFormatted = useMemo(() => {
      return stats.maxApy > 0 ? `${(stats.maxApy * 100).toFixed(2)}%` : '0.00%'
    }, [stats.maxApy])

    const assetIconElement = useMemo(() => {
      if (assetId) return <AssetIcon assetId={assetId} size='sm' showNetworkIcon={false} />
      return <AssetIcon src={assetIcon} size='sm' />
    }, [assetId, assetIcon])

    const userBalanceElement = useMemo(() => {
      if (!userGroupBalanceUsd || !userGroupBalanceUsd.gt(0)) return null
      return (
        <Box minW='120px' display={{ base: 'none', md: 'block' }}>
          <Text fontSize='sm' fontWeight='bold' color='blue.400'>
            <Amount.Fiat value={userGroupBalanceUserCurrency ?? '0'} abbreviated />
          </Text>
        </Box>
      )
    }, [userGroupBalanceUsd, userGroupBalanceUserCurrency])

    const providersElement = useMemo(
      () => (
        <AvatarGroup size='xs' max={4}>
          {stats.providers.map(p => (
            <Avatar key={p.id} src={p.logo} name={p.id} />
          ))}
        </AvatarGroup>
      ),
      [stats.providers],
    )

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
            {assetIconElement}
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
                {maxApyFormatted}
              </Text>
            </Box>
            <Box minW='120px' display={{ base: 'none', md: 'block' }}>
              <Text fontSize='xs' color='text.subtle'>
                TVL
              </Text>
              <Text fontSize='sm'>
                <Amount.Fiat value={stats.totalTvlUserCurrency} abbreviated />
              </Text>
            </Box>
            {userBalanceElement}
            <Box flex='1' display={{ base: 'none', lg: 'block' }}>
              {providersElement}
            </Box>
          </Flex>
        </Flex>
      </Box>
    )
  },
)

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

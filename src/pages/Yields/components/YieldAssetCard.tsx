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
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import BigNumber from 'bignumber.js'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'

type YieldAssetCardProps = {
  assetSymbol: string
  assetName: string
  assetIcon: string
  assetId?: string
  yields: AugmentedYieldDto[]
  userGroupBalanceUsd?: BigNumber
}

export const YieldAssetCard = ({
  assetSymbol,
  assetName,
  assetIcon,
  assetId,
  yields,
  userGroupBalanceUsd,
}: YieldAssetCardProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const cardBg = useColorModeValue('white', 'gray.800')
  const hoverBorderColor = useColorModeValue('blue.500', 'blue.400')

  const { data: yieldProviders } = useYieldProviders()

  const stats = useMemo(() => {
    let maxApy = 0
    let totalTvl = bnOrZero(0)
    const providerIds = new Set<string>()
    const chainIds = new Set<string>()

    yields.forEach(y => {
      const apy = y.rewardRate.total
      if (apy > maxApy) maxApy = apy
      totalTvl = totalTvl.plus(bnOrZero(y.statistics?.tvlUsd))
      providerIds.add(y.providerId)
      if (y.chainId) chainIds.add(y.chainId)
    })

    const providers = Array.from(providerIds).map(id => ({
      id,
      logo: yieldProviders?.[id]?.logoURI,
    }))

    return {
      maxApy,
      totalTvl,
      providers,
      chainIds: Array.from(chainIds),
      count: yields.length,
    }
  }, [yields, yieldProviders])

  const handleClick = () => {
    navigate(`/yields/asset/${encodeURIComponent(assetSymbol)}`)
  }

  const hasBalance = userGroupBalanceUsd && userGroupBalanceUsd.gt(0)

  return (
    <Card
      bg={cardBg}
      borderWidth='1px'
      borderColor={borderColor}
      boxShadow='sm'
      cursor='pointer'
      onClick={handleClick}
      transition='all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      _hover={{
        borderColor: hoverBorderColor,
        transform: 'translateY(-2px)',
        boxShadow: 'lg',
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
            {assetId ? (
              <AssetIcon
                assetId={assetId}
                size='md'
                boxShadow='md'
                borderWidth='1px'
                borderColor={borderColor}
                showNetworkIcon={false}
              />
            ) : (
              <AssetIcon
                src={assetIcon}
                size='md'
                boxShadow='md'
                borderWidth='1px'
                borderColor={borderColor}
              />
            )}
            <Box>
              <Text
                fontWeight='bold'
                fontSize='md'
                noOfLines={1}
                maxW='200px'
                lineHeight='1.2'
                mb={1}
              >
                {assetName}
              </Text>
              <Text fontSize='xs' color='text.subtle'>
                {stats.count} {stats.count === 1 ? 'market' : 'markets'}
              </Text>
            </Box>
          </Flex>
        </Flex>

        <HStack spacing={6} justify='space-between' mt='auto'>
          <Stat size='sm'>
            <StatLabel fontSize='xs' color='text.subtle'>
              {translate('yieldXYZ.maxApy')}
            </StatLabel>
            <StatNumber
              fontSize='xl'
              fontWeight='bold'
              bgGradient='linear(to-r, green.300, blue.400)'
              bgClip='text'
            >
              {stats.maxApy > 0 ? `${(stats.maxApy * 100).toFixed(2)}%` : 'N/A'}
            </StatNumber>
          </Stat>

          <Stat size='sm' textAlign='right'>
            {hasBalance ? (
              <>
                <StatLabel fontSize='xs' color='text.subtle'>
                  My Balance
                </StatLabel>
                <StatNumber fontSize='md' fontWeight='bold' color='blue.400'>
                  <Amount.Fiat value={userGroupBalanceUsd.toFixed()} abbreviated />
                </StatNumber>
              </>
            ) : (
              <>
                <StatLabel fontSize='xs' color='text.subtle'>
                  {translate('yieldXYZ.tvl')}
                </StatLabel>
                <StatNumber fontSize='md' fontWeight='semibold'>
                  <Amount.Fiat value={stats.totalTvl.toFixed()} abbreviated />
                </StatNumber>
              </>
            )}
          </Stat>
        </HStack>

        <Box mt={4} pt={4} borderTopWidth='1px' borderColor={borderColor}>
          <Flex justify='space-between' mb={2}>
            <Box>
              <Text fontSize='xs' color='text.subtle' mb={1}>
                {stats.providers.length} {stats.providers.length === 1 ? 'protocol' : 'protocols'}
              </Text>
              <AvatarGroup size='xs' max={5} spacing={-1}>
                {stats.providers.map(p => (
                  <Avatar key={p.id} src={p.logo} name={p.id} />
                ))}
              </AvatarGroup>
            </Box>
            <Box textAlign='right'>
              <Text fontSize='xs' color='text.subtle' mb={1}>
                {stats.chainIds.length} {stats.chainIds.length === 1 ? 'chain' : 'chains'}
              </Text>
              <HStack spacing={-1} justify='flex-end'>
                {stats.chainIds.slice(0, 5).map(chainId => (
                  <ChainIcon key={chainId} chainId={chainId} boxSize='20px' />
                ))}
              </HStack>
            </Box>
          </Flex>
        </Box>
      </CardBody>
    </Card>
  )
}

export const YieldAssetCardSkeleton = () => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const cardBg = useColorModeValue('white', 'gray.800')

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

        <Box mt={4} pt={4} borderTopWidth='1px' borderColor={borderColor}>
          <Skeleton height='12px' width='80px' mb={2} />
          <HStack spacing={-1}>
            <SkeletonCircle size='6' />
            <SkeletonCircle size='6' />
            <SkeletonCircle size='6' />
          </HStack>
        </Box>
      </CardBody>
    </Card>
  )
}

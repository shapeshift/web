import {
  Avatar,
  Badge,
  Box,
  Flex,
  HStack,
  Skeleton,
  SkeletonCircle,
  Stat,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'

interface YieldRowProps {
  yield: AugmentedYieldDto
  onEnter?: (yieldItem: AugmentedYieldDto) => void
}

export const YieldRow = ({ yield: yieldItem, onEnter }: YieldRowProps) => {
  const hoverBg = useColorModeValue('gray.50', 'gray.750')
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100')

  const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()

  const handleClick = () => {
    if (yieldItem.status.enter) {
      onEnter?.(yieldItem)
    }
  }

  // Filter out redundant tags to reduce clutter
  const visibleTags = yieldItem.tags
    .filter(t => t !== yieldItem.network && t !== 'vault' && t.length < 15)
    .slice(0, 2)

  return (
    <Flex
      justifyContent='space-between'
      alignItems='center'
      p={4}
      borderBottomWidth='1px'
      borderColor={borderColor}
      cursor={yieldItem.status.enter ? 'pointer' : 'default'}
      onClick={handleClick}
      transition='background-color 0.2s'
      _hover={{ bg: hoverBg }}
    >
      {/* 1. Asset / Protocol */}
      <HStack spacing={4} flex={2} minW='200px'>
        <Avatar src={yieldItem.metadata.logoURI} size='sm' name={yieldItem.metadata.name} />
        <Box>
          <Text fontWeight='bold' fontSize='sm' noOfLines={1} lineHeight='shorter'>
            {yieldItem.metadata.name}
          </Text>
          <HStack spacing={1}>
            <Badge fontSize='xx-small' variant='subtle'>
              {yieldItem.network}
            </Badge>
            <Text fontSize='xs' color='text.subtle' textTransform='capitalize'>
              {yieldItem.providerId}
            </Text>
          </HStack>
        </Box>
      </HStack>

      {/* 2. APY */}
      <Box flex={1}>
        <Stat size='sm'>
          <GradientApy fontSize='md' lineHeight='1'>
            {apy.toFixed(2)}%
          </GradientApy>
          <Text fontSize='xs' color='text.subtle'>
            {yieldItem.rewardRate.rateType}
          </Text>
        </Stat>
      </Box>

      {/* 3. TVL */}
      <Box flex={1} display={{ base: 'none', md: 'block' }}>
        <Text fontWeight='semibold' fontSize='sm'>
          <Amount.Fiat value={yieldItem.statistics?.tvlUsd ?? '0'} abbreviated />
        </Text>
        <Text fontSize='xs' color='text.subtle'>
          TVL
        </Text>
      </Box>

      {/* 4. Tags / Badges */}
      <HStack flex={1} spacing={2} display={{ base: 'none', lg: 'flex' }} justify='flex-end'>
        {visibleTags.map((tag, idx) => (
          <Badge key={idx} variant='outline' fontSize='xs' borderRadius='md'>
            {tag}
          </Badge>
        ))}
      </HStack>
    </Flex>
  )
}

export const YieldRowSkeleton = () => (
  <Flex
    justifyContent='space-between'
    alignItems='center'
    p={4}
    borderBottomWidth='1px'
    borderColor='whiteAlpha.100'
  >
    <HStack spacing={4} flex={2}>
      <SkeletonCircle size='8' />
      <Box>
        <Skeleton height='16px' width='120px' mb={1} />
        <Skeleton height='12px' width='60px' />
      </Box>
    </HStack>
    <Box flex={1}>
      <Skeleton height='24px' width='60px' mb={1} />
      <Skeleton height='12px' width='40px' />
    </Box>
    <Box flex={1} display={{ base: 'none', md: 'block' }}>
      <Skeleton height='16px' width='80px' mb={1} />
      <Skeleton height='12px' width='30px' />
    </Box>
    <Box flex={1} display={{ base: 'none', lg: 'block' }}>
      <Skeleton height='20px' width='100px' float='right' />
    </Box>
  </Flex>
)

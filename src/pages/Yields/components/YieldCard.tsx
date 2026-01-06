import { AssetIcon } from '@/components/AssetIcon'
import {
  Badge,
  Box,
  Card,
  CardBody,
  Flex,
  Skeleton,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatLargeNumber } from '@/lib/utils/formatters'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

interface YieldCardProps {
  yield: AugmentedYieldDto
  onEnter?: (yieldItem: AugmentedYieldDto) => void
  isLoading?: boolean
  providerIcon?: string
}

export const YieldCard = ({ yield: yieldItem, onEnter, providerIcon }: YieldCardProps) => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const cardBg = useColorModeValue('white', 'gray.800')
  const hoverBorderColor = useColorModeValue('blue.500', 'blue.400')

  const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()
  const apyLabel = yieldItem.rewardRate.rateType

  const handleClick = () => {
    if (yieldItem.status.enter) {
      onEnter?.(yieldItem)
    }
  }

  // Filter out redundant tags to reduce clutter
  const visibleTags = yieldItem.tags
    .filter(t => t !== yieldItem.network && t !== 'vault' && t.length < 15)
    .slice(0, 3)

  return (
    <Card
      bg={cardBg}
      borderWidth='1px'
      borderColor={borderColor}
      boxShadow='sm'
      cursor={yieldItem.status.enter ? 'pointer' : 'default'}
      onClick={handleClick}
      transition='all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      _hover={{
        borderColor: hoverBorderColor,
        transform: 'translateY(-2px)',
        boxShadow: 'lg',
      }}
      borderRadius='xl'
      variant='outline'
    >
      <CardBody p={5}>
        {/* Header: Icon + Name */}
        <Flex justifyContent='space-between' alignItems='flex-start' mb={6}>
          <Flex alignItems='center' gap={4}>
            <AssetIcon
              src={yieldItem.metadata.logoURI}
              assetId={yieldItem.token.assetId}
              showNetworkIcon
              size='md'
              boxShadow='md'
              borderWidth='1px'
              borderColor={borderColor}
            />
            <Box>
              <Text
                fontWeight='bold'
                fontSize='md'
                noOfLines={1}
                maxW='200px'
                lineHeight='1.2'
                mb={1}
              >
                {yieldItem.metadata.name}
              </Text>
              <Flex alignItems='center' gap={2}>
                {providerIcon && (
                  <Box
                    as='img'
                    src={providerIcon}
                    w={4}
                    h={4}
                    borderRadius='full'
                    title={yieldItem.providerId}
                  />
                )}
                <Text fontSize='xs' color='text.subtle' textTransform='capitalize'>
                  {yieldItem.providerId}
                </Text>
              </Flex>
            </Box>
          </Flex>
        </Flex>

        {/* Hero Section: APY */}
        <Flex justifyContent='space-between' alignItems='flex-end' mb={6}>
          <Box>
            <Stat>
              <StatLabel color='text.subtle' fontSize='xs' mb={1}>
                {translate('yieldXYZ.apy')} ({apyLabel})
              </StatLabel>
              <StatNumber
                fontSize='3xl'
                fontWeight='800'
                bgGradient='linear(to-r, green.300, blue.400)'
                bgClip='text'
                lineHeight='1'
              >
                {apy.toFixed(2)}%
              </StatNumber>
            </Stat>

            {/* Reward breakdown pills */}
            {yieldItem.rewardRate.components.length > 0 && (
              <Flex gap={2} mt={3}>
                {yieldItem.rewardRate.components.slice(0, 2).map((component, idx) => (
                  <Flex key={idx} alignItems='center' gap={1}>
                    <Box w={1.5} h={1.5} borderRadius='full' bg='green.400' />
                    <Text fontSize='xs' color='text.subtle'>
                      {bnOrZero(component.rate).times(100).toFixed(1)}% {component.yieldSource}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            )}
          </Box>

          <Box textAlign='right'>
            <Text fontSize='xs' color='text.subtle' mb={1}>
              TVL
            </Text>
            <Text fontWeight='semibold' fontSize='md'>
              {formatLargeNumber(yieldItem.statistics?.tvlUsd ?? '0', '$')}
            </Text>
          </Box>
        </Flex>

        {/* Footer: Tags + Action */}
        <Flex justifyContent='space-between' alignItems='center' gap={4}>
          <Flex gap={2}>
            {visibleTags.map((tag, idx) => (
              <Badge
                key={idx}
                variant='subtle'
                colorScheme='gray'
                fontSize='xs'
                borderRadius='full'
                px={2}
                py={0.5}
              >
                {tag}
              </Badge>
            ))}
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  )
}

export const YieldCardSkeleton = () => (
  <Card variant='outline' borderRadius='xl'>
    <CardBody p={5}>
      <Flex justifyContent='space-between' alignItems='flex-start' mb={6}>
        <Flex alignItems='center' gap={4}>
          <Skeleton w={12} h={12} borderRadius='full' />
          <Box>
            <Skeleton height='20px' width='140px' mb={2} />
            <Skeleton height='16px' width='80px' />
          </Box>
        </Flex>
      </Flex>
      <Box mb={6}>
        <Skeleton height='14px' width='60px' mb={2} />
        <Skeleton height='36px' width='120px' />
      </Box>
      <Skeleton height='48px' width='100%' borderRadius='lg' />
    </CardBody>
  </Card>
)

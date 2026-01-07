import {
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

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'

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
            {(() => {
              const iconSource = resolveYieldInputAssetIcon(yieldItem)
              return iconSource.assetId ? (
                <AssetIcon
                  assetId={iconSource.assetId}
                  size='md'
                  boxShadow='md'
                  borderWidth='1px'
                  borderColor={borderColor}
                />
              ) : (
                <AssetIcon
                  src={iconSource.src}
                  size='md'
                  boxShadow='md'
                  borderWidth='1px'
                  borderColor={borderColor}
                />
              )
            })()}
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

            {/* Reward breakdown pills removed as per user request */}
          </Box>

          <Box textAlign='right'>
            <Text fontSize='xs' color='text.subtle' mb={1}>
              TVL
            </Text>
            <Text fontWeight='semibold' fontSize='md'>
              <Amount.Fiat value={yieldItem.statistics?.tvlUsd ?? '0'} abbreviated />
            </Text>
          </Box>
        </Flex>

        {/* Footer: Tags + Action */}
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

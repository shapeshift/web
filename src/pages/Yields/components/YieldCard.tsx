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
import type BigNumber from 'bignumber.js'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

interface YieldCardProps {
  yieldItem: AugmentedYieldDto
  onEnter?: (yieldItem: AugmentedYieldDto) => void
  isLoading?: boolean
  providerIcon?: string
  userBalanceUsd?: BigNumber
}

export const YieldCard = ({ yieldItem, onEnter, providerIcon, userBalanceUsd }: YieldCardProps) => {
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const cardBg = useColorModeValue('white', 'gray.800')
  const hoverBorderColor = useColorModeValue('blue.500', 'blue.400')
  const cardShadow = useColorModeValue('sm', 'none')
  const cardHoverShadow = useColorModeValue('lg', 'lg')

  const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()
  const apyLabel = yieldItem.rewardRate.rateType

  const handleClick = () => {
    if (yieldItem.status.enter) {
      onEnter?.(yieldItem)
    }
  }

  const hasBalance = userBalanceUsd && userBalanceUsd.gt(0)

  const userBalanceUserCurrency = useMemo(
    () => (userBalanceUsd ? userBalanceUsd.times(userCurrencyToUsdRate).toFixed() : undefined),
    [userBalanceUsd, userCurrencyToUsdRate],
  )

  const tvlUserCurrency = useMemo(
    () =>
      bnOrZero(yieldItem.statistics?.tvlUsd)
        .times(userCurrencyToUsdRate)
        .toFixed(),
    [yieldItem.statistics?.tvlUsd, userCurrencyToUsdRate],
  )

  return (
    <Card
      bg={cardBg}
      borderWidth='1px'
      borderColor={borderColor}
      boxShadow={cardShadow}
      cursor={yieldItem.status.enter ? 'pointer' : 'default'}
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

        {/* Hero Section: APY & TVL */}
        <Flex justifyContent='space-between' alignItems='flex-end' mt='auto'>
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
          </Box>

          <Box textAlign='right'>
            {hasBalance && userBalanceUserCurrency ? (
              <>
                <Text fontWeight='bold' fontSize='lg' color='blue.400'>
                  <Amount.Fiat value={userBalanceUserCurrency} abbreviated />
                </Text>
              </>
            ) : (
              <>
                <Text fontSize='xs' color='text.subtle' mb={1}>
                  TVL
                </Text>
                <Text fontWeight='semibold' fontSize='md'>
                  <Amount.Fiat value={tvlUserCurrency} abbreviated />
                </Text>
              </>
            )}
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

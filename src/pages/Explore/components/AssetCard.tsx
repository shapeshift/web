import { Box, Flex, Tag, TagLeftIcon, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

interface AssetCardProps {
  asset: Asset
  width?: string
}

export const AssetCard: FC<AssetCardProps> = memo(({ asset, width = '80%' }) => {
  const navigate = useNavigate()
  const textColor = useColorModeValue('black', 'white')

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
  )
  const changePercent24Hr = marketData?.changePercent24Hr

  const priceChange = useMemo(() => {
    if (!changePercent24Hr) return null

    const isPriceChangePositive = bnOrZero(changePercent24Hr).gte(0)

    return (
      <Tag
        colorScheme={isPriceChangePositive ? 'green' : 'red'}
        size='sm'
        px={2}
        py={1}
        borderRadius='md'
      >
        <TagLeftIcon as={isPriceChangePositive ? RiArrowRightUpLine : RiArrowLeftDownLine} me={1} />
        <Amount.Percent value={bnOrZero(changePercent24Hr).times(0.01).toString()} fontSize='xs' />
      </Tag>
    )
  }, [changePercent24Hr])

  const handleClick = useCallback(() => {
    navigate(`/assets/${asset.assetId}`)
  }, [navigate, asset.assetId])

  return (
    <Box
      width={width}
      minWidth={width}
      bg={'background.surface.raised.base'}
      borderRadius='lg'
      p={4}
      cursor='pointer'
      onClick={handleClick}
      transition='all 0.2s'
    >
      <Flex flexDir='column' gap={3}>
        <Flex alignItems='center' gap={3}>
          <AssetIcon assetId={asset.assetId} size='md' />
        </Flex>

        <Flex justifyContent='space-between' alignItems='center'>
          <Box flex={1} minWidth={0}>
            <Text
              fontWeight='semibold'
              fontSize='sm'
              color={textColor}
              noOfLines={1}
              textOverflow='ellipsis'
            >
              {asset.name}
            </Text>
            <Text fontSize='xs' color='text.subtle'>
              {asset.symbol}
            </Text>
          </Box>
          <Flex flexDir='column' gap={1} alignItems='flex-end'>
            <Amount.Fiat
              fontWeight='bold'
              color={textColor}
              fontSize='sm'
              value={marketData?.price}
            />
            {priceChange}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  )
})

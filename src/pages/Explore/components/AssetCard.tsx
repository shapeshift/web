import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { WatchAssetButton } from '@/components/AssetHeader/WatchAssetButton'
import { AssetIcon } from '@/components/AssetIcon'
import { PriceChangeTag } from '@/components/PriceChangeTag/PriceChangeTag'
import { vibrate } from '@/lib/vibrate'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetCardProps = {
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

  const handleClick = useCallback(() => {
    vibrate('heavy')
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
        <Flex alignItems='center' gap={3} justifyContent='space-between'>
          <AssetIcon assetId={asset.assetId} size='md' />
          <WatchAssetButton assetId={asset.assetId} />
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
            <PriceChangeTag changePercent24Hr={changePercent24Hr} />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  )
})

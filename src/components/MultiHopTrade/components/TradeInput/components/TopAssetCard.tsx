import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons'
import { Box, Flex, HStack, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const hoverProps = {
  bg: 'background.surface.raised.hover',
}

type TopAssetCardProps = {
  asset: Asset
  onClick: (asset: Asset) => void
}

export const TopAssetCard = ({ asset, onClick }: TopAssetCardProps) => {
  const textColor = useColorModeValue('black', 'white')

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
  )
  const changePercent24Hr = marketData?.changePercent24Hr

  const isPositive = bnOrZero(changePercent24Hr).gt(0)

  const handleClick = useCallback(() => {
    onClick(asset)
  }, [asset, onClick])

  return (
    <Flex
      cursor='pointer'
      px={2}
      py={4}
      alignSelf='stretch'
      justifyContent='center'
      alignItems='center'
      onClick={handleClick}
      role='button'
      tabIndex={0}
      transition='all 0.2s'
      _hover={hoverProps}
      whiteSpace='nowrap'
    >
      <Flex alignItems='center' gap={2} justifyContent='center' minWidth={0}>
        <Flex alignItems='center' gap={2} minWidth={0} flex={1} overflow='hidden'>
          <AssetIcon assetId={asset.assetId} size='2xs' flexShrink={0} />
          <Box minWidth={0} overflow='hidden' flex={1}>
            <Text
              fontWeight='semibold'
              fontSize='xs'
              color={textColor}
              noOfLines={1}
              overflow='hidden'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              lineHeight={1}
            >
              {asset.symbol}
            </Text>
          </Box>
        </Flex>
        <HStack spacing={1} flexShrink={0}>
          <Amount.Fiat
            fontWeight='semibold'
            color={textColor}
            fontSize='xs'
            lineHeight={1}
            value={marketData?.price}
          />
          <Icon
            as={isPositive ? TriangleDownIcon : TriangleUpIcon}
            lineHeight={1}
            boxSize={3}
            color={isPositive ? 'text.success' : 'text.error'}
          />
          <Amount.Percent
            value={bnOrZero(changePercent24Hr).times('0.01').toString()}
            color={isPositive ? 'text.success' : 'text.error'}
            fontWeight='semibold'
            fontSize='xs'
            lineHeight={1}
          />
        </HStack>
      </Flex>
    </Flex>
  )
}

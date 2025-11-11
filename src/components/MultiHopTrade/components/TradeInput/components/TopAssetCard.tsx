import { Box, Flex, HStack, Icon, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { TbCircleArrowDownRightFilled, TbCircleArrowUpRightFilled } from 'react-icons/tb'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { vibrate } from '@/lib/vibrate'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const hoverProps = {
  bg: 'background.surface.raised.hover',
}

type TopAssetCardProps = {
  asset: Asset
}

export const TopAssetCard = ({ asset }: TopAssetCardProps) => {
  const dispatch = useAppDispatch()
  const textColor = useColorModeValue('black', 'white')

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
  )
  const changePercent24Hr = marketData?.changePercent24Hr

  const handleClick = useCallback(() => {
    vibrate('heavy')
    dispatch(tradeInput.actions.setBuyAsset(asset))
  }, [asset, dispatch])

  const isPositive = bnOrZero(changePercent24Hr).gt(0)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick],
  )

  return (
    <Flex
      cursor='pointer'
      px={2}
      height='44px'
      justifyContent='center'
      alignItems='center'
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
            as={isPositive ? TbCircleArrowUpRightFilled : TbCircleArrowDownRightFilled}
            lineHeight={1}
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

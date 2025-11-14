import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, Text } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useLongPress } from 'use-long-press'

import type { AssetData } from './AssetList'

import { Amount } from '@/components/Amount/Amount'
import { WatchAssetButton } from '@/components/AssetHeader/WatchAssetButton'
import { AssetIcon } from '@/components/AssetIcon'
import { PriceChangeTag } from '@/components/PriceChangeTag/PriceChangeTag'
import { defaultLongPressConfig } from '@/constants/longPress'
import { vibrate } from '@/lib/vibrate'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const focus = {
  shadow: 'outline-inset',
}

export type MarketRowData = {
  asset: Asset
  index: number
  data: AssetData
}

export type MarketRowProps = MarketRowData & ButtonProps

export const MarketRow: FC<MarketRowProps> = memo(
  ({ asset, data: { handleClick, handleLongPress }, ...props }) => {
    const assetId = asset?.assetId

    const handleOnClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        handleClick(asset)
      },
      [asset, handleClick],
    )

    const longPressHandlers = useLongPress((_, { context: row }) => {
      vibrate('heavy')
      handleLongPress?.(row as Asset)
    }, defaultLongPressConfig)

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
    )

    const changePercent24Hr = marketData?.changePercent24Hr

    const rightContent = useMemo(
      () => (
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
          <Amount.Fiat
            fontWeight='medium'
            color='text.base'
            lineHeight={1}
            value={marketData?.price}
          />
          <PriceChangeTag changePercent24Hr={changePercent24Hr} />
        </Flex>
      ),
      [marketData?.price, changePercent24Hr],
    )

    return (
      <Button
        variant='ghost'
        onClick={handleOnClick}
        justifyContent='space-between'
        _focus={focus}
        width='100%'
        height='auto'
        p={4}
        {...props}
        {...longPressHandlers(asset)}
      >
        <Flex gap={3} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={asset.assetId} size='md' flexShrink={0} />
          <Flex gap={1} flexDir='column' textAlign='left' flex={1} minWidth={0}>
            <Text
              color='text.base'
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
            >
              {asset.name}
            </Text>
            <Text fontWeight='medium' fontSize='sm' color='text.subtle'>
              {asset.symbol}
            </Text>
          </Flex>
        </Flex>
        {rightContent}
        <WatchAssetButton assetId={asset.assetId} bg='transparent' />
      </Button>
    )
  },
)

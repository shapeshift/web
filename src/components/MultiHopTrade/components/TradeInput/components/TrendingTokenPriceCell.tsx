import { Skeleton, Stack, Tag, TagLeftIcon, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TrendingTokenPriceCellProps = {
  assetId: AssetId
}

export const TrendingTokenPriceCell = ({ assetId }: TrendingTokenPriceCellProps) => {
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const changePercent24Hr = marketData?.changePercent24Hr

  const textColor = useColorModeValue('black', 'white')

  const priceChange = useMemo(() => {
    const isPositive = bnOrZero(changePercent24Hr).gte(0)

    return (
      <Tag colorScheme={isPositive ? 'green' : 'red'} width='max-content' px={1}>
        <TagLeftIcon as={isPositive ? RiArrowRightUpLine : RiArrowLeftDownLine} me={1} />
        <Amount.Percent
          value={bnOrZero(changePercent24Hr).times(0.01).toString()}
          fontSize='xs'
          color={isPositive ? 'green.500' : 'red.500'}
        />
      </Tag>
    )
  }, [changePercent24Hr])

  if (!marketData)
    return (
      <Stack spacing={0} fontWeight='medium' textAlign='right'>
        <Skeleton width='120px' height='20px' />
        <Skeleton width='80px' height='20px' />
      </Stack>
    )

  return (
    <Stack spacing={0} fontWeight='medium' textAlign='right' alignItems='flex-end'>
      <Amount.Fiat
        fontWeight='semibold'
        color={textColor}
        lineHeight='shorter'
        height='20px'
        value={marketData?.price}
      />
      {priceChange}
    </Stack>
  )
}

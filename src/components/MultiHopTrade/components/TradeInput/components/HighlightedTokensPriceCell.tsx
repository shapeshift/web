import { Stack, Tag, TagLeftIcon, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { MarketsCategories } from '@/pages/Markets/constants'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type HighlightedTokensPriceCellProps = {
  assetId: AssetId
  selectedCategory: MarketsCategories
  portalsAssets: PortalsAssets | undefined
}

export const HighlightedTokensPriceCell = ({
  assetId,
  selectedCategory,
  portalsAssets,
}: HighlightedTokensPriceCellProps) => {
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const changePercent24Hr = marketData?.changePercent24Hr
  const textColor = useColorModeValue('black', 'white')

  const priceChange = useMemo(() => {
    if (selectedCategory === MarketsCategories.OneClickDefi) {
      const maybePortalsAsset = portalsAssets?.byId[assetId]
      const apy = bnOrZero(maybePortalsAsset?.metrics.apy ?? 0)
      const isPositive = apy.gte(0)

      return (
        <Tag colorScheme={isPositive ? 'green' : 'red'} width='max-content' px={1}>
          <Text translation='common.apy' fontSize='xs' me={2} />
          <Amount.Percent
            value={bnOrZero(maybePortalsAsset?.metrics.apy ?? 0)
              .times(0.01)
              .toString()}
            fontSize='xs'
          />
        </Tag>
      )
    }

    const isPositive = bnOrZero(changePercent24Hr).gte(0)

    return (
      <Tag colorScheme={isPositive ? 'green' : 'red'} width='max-content' px={1}>
        <TagLeftIcon as={isPositive ? RiArrowRightUpLine : RiArrowLeftDownLine} me={1} />
        <Amount.Percent value={bnOrZero(changePercent24Hr).times(0.01).toString()} fontSize='xs' />
      </Tag>
    )
  }, [changePercent24Hr, selectedCategory, assetId, portalsAssets])

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

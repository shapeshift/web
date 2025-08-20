import { Stack, Tag, TagLeftIcon, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'

import { Amount } from '@/components/Amount/Amount'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { mergeRealtimePrice } from '@/lib/market-service/utils/mergeRealtimePrice'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { useRealtimePrice } from '@/pages/Markets/hooks/useRealtimePrice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type HighlightedTokensPriceCellProps = {
  assetId: AssetId
  selectedSort: SortOptionsKeys
  portalsAssets: PortalsAssets | undefined
}

export const HighlightedTokensPriceCell = ({
  assetId,
  selectedSort,
  portalsAssets,
}: HighlightedTokensPriceCellProps) => {
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const textColor = useColorModeValue('black', 'white')

  // Check if realtime prices feature is enabled
  const featureFlags = useAppSelector(preferences.selectors.selectFeatureFlags)
  const isRealtimePricesEnabled = featureFlags.RealtimePrices

  // Get realtime price for this asset (only if feature is enabled)
  const { price: realtimePrice } = useRealtimePrice(assetId, isRealtimePricesEnabled)

  // Merge market data with realtime price
  const enhancedMarketData = useMemo(
    () => (marketData ? mergeRealtimePrice(marketData, realtimePrice) : undefined),
    [marketData, realtimePrice],
  )

  const changePercent24Hr = enhancedMarketData?.changePercent24Hr

  const priceChange = useMemo(() => {
    const volume = bnOrZero(enhancedMarketData?.volume)
    const isVolumePositive = volume.gte(0)
    const maybePortalsAsset = portalsAssets?.byId[assetId]
    const apy = bnOrZero(maybePortalsAsset?.metrics.apy)
    const isApyPositive = apy.gte(0)
    const isPriceChangePositive = bnOrZero(changePercent24Hr).gte(0)

    if (selectedSort === SortOptionsKeys.Apy) {
      return (
        <Tag colorScheme={isApyPositive ? 'green' : 'red'} width='max-content' px={1}>
          <Text translation='common.apy' fontSize='xs' me={2} />
          <Amount.Percent
            value={bnOrZero(maybePortalsAsset?.metrics.apy)
              .times(0.01)
              .toString()}
            fontSize='xs'
          />
        </Tag>
      )
    }

    if (selectedSort === SortOptionsKeys.Volume) {
      return (
        <Tag colorScheme={isVolumePositive ? 'green' : 'red'} width='max-content' px={1}>
          <Amount.Fiat value={volume.toString()} fontSize='xs' />
        </Tag>
      )
    }

    if (selectedSort === SortOptionsKeys.MarketCap) {
      const marketCap = bnOrZero(enhancedMarketData?.marketCap)

      return (
        <Tag colorScheme={'gray'} width='max-content' px={1}>
          <Amount.Fiat value={marketCap.toString()} fontSize='xs' />
        </Tag>
      )
    }

    return (
      <Tag colorScheme={isPriceChangePositive ? 'green' : 'red'} width='max-content' px={1}>
        <TagLeftIcon as={isPriceChangePositive ? RiArrowRightUpLine : RiArrowLeftDownLine} me={1} />
        <Amount.Percent value={bnOrZero(changePercent24Hr).times(0.01).toString()} fontSize='xs' />
      </Tag>
    )
  }, [
    changePercent24Hr,
    selectedSort,
    assetId,
    portalsAssets,
    enhancedMarketData?.volume,
    enhancedMarketData?.marketCap,
  ])

  return (
    <Stack spacing={0} fontWeight='medium' textAlign='right' alignItems='flex-end'>
      <Amount.Fiat
        fontWeight='semibold'
        color={enhancedMarketData?.isRealtime ? 'green.500' : textColor}
        lineHeight='shorter'
        height='20px'
        value={enhancedMarketData?.price}
      />
      {priceChange}
    </Stack>
  )
}

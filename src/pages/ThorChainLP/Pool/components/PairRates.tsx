import { Card, Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { vibrate } from '@/lib/vibrate'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type PairRatesProps = {
  assetIds: AssetId[]
}

const hoverProps = { background: 'background.surface.raised.hover', cursor: 'pointer' }

type AssetCardProps = {
  assetId: AssetId
  value: string
  prefix: string
  symbol: string
  onClick: (assetId: AssetId) => void
}

const AssetCard: React.FC<AssetCardProps> = ({ assetId, value, prefix, symbol, onClick }) => {
  const handleClick = useCallback(() => {
    vibrate('heavy')
    onClick(assetId)
  }, [assetId, onClick])

  return (
    <Card borderRadius='full' _hover={hoverProps} onClick={handleClick}>
      <Flex gap={2} pl={2} pr={3} py={2} alignItems='center' fontWeight='medium'>
        <AssetIcon size='xs' assetId={assetId} />
        <Amount.Crypto
          value={value}
          prefix={prefix}
          symbol={symbol}
          fontSize='xs'
          maximumFractionDigits={4}
        />
      </Flex>
    </Card>
  )
}

export const PairRates: React.FC<PairRatesProps> = ({ assetIds }) => {
  const navigate = useNavigate()
  const asset0 = useAppSelector(state => selectAssetById(state, assetIds[0]))
  const asset1 = useAppSelector(state => selectAssetById(state, assetIds[1]))
  const asset0MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetIds[0]),
  )
  const asset1MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetIds[1]),
  )

  const asset0PricePerAsset1 = bnOrZero(asset1MarketData?.price)
    .div(bnOrZero(asset0MarketData?.price))
    .toString()
  const asset1PricePerAsset0 = bnOrZero(asset0MarketData?.price)
    .div(bnOrZero(asset1MarketData?.price))
    .toString()

  const handleAssetClick = useCallback(
    (assetId: AssetId) => {
      const url = `/assets/${assetId}`
      navigate(url)
    },
    [navigate],
  )

  if (!(asset0 && asset1 && asset0MarketData && asset1MarketData)) {
    return null
  }

  return (
    <Flex gap={4} alignItems='center'>
      <AssetCard
        assetId={assetIds[0]}
        value={asset1PricePerAsset0}
        prefix={`1 ${asset0.symbol} =`}
        symbol={asset1.symbol}
        onClick={handleAssetClick}
      />
      <AssetCard
        assetId={assetIds[1]}
        value={asset0PricePerAsset1}
        prefix={`1 ${asset1.symbol} =`}
        symbol={asset0.symbol}
        onClick={handleAssetClick}
      />
    </Flex>
  )
}

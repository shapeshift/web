import { Text as CText } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CommonCard, CommonStat } from './CommonCard'

type AssetCardProps = {
  assetId: AssetId
  onClick: (assetId: AssetId) => void
  showMarketCap?: boolean
}

export const AssetCard: React.FC<AssetCardProps> = ({ assetId, showMarketCap, onClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const changePercent24Hr = marketData.changePercent24Hr
  const translate = useTranslate()

  const handleClick = useCallback(() => onClick(assetId), [assetId, onClick])

  const priceValue = useMemo(() => <Amount.Fiat value={marketData.price} />, [marketData.price])

  const priceChange = useMemo(() => {
    return <Amount.Percent autoColor value={bnOrZero(changePercent24Hr).times(0.01).toString()} />
  }, [changePercent24Hr])

  const marketCapValue = useMemo(() => {
    return bnOrZero(marketData.marketCap).isPositive() ? (
      <Amount.Fiat value={marketData.marketCap} />
    ) : (
      <CText>N/A</CText>
    )
  }, [marketData.marketCap])

  if (!asset) return null

  return (
    <>
      <CommonCard
        title={asset.name}
        subtitle={asset.symbol}
        assetId={assetId}
        onClick={handleClick}
      >
        <CommonStat label={priceChange} value={priceValue} />
        {showMarketCap && (
          <CommonStat
            label={translate('dashboard.portfolio.marketCap')}
            value={marketCapValue}
            align='flex-end'
          />
        )}
      </CommonCard>
    </>
  )
}

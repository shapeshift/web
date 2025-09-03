import { Text as CText, GridItem, Text, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { CommonCard, CommonStat } from './CommonCard'

import { Amount } from '@/components/Amount/Amount'
import { buildAssetTitle } from '@/components/AssetName/AssetName'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { vibrate } from '@/lib/vibrate'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectStakingOpportunityByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type LpCardProps = {
  assetId: AssetId
  apy: string
  volume24H: string | undefined
  onClick: (assetId: AssetId) => void
}

export const LpCard: React.FC<LpCardProps> = ({ assetId, apy, volume24H, onClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const translate = useTranslate()

  const handleClick = useCallback(() => {
    vibrate('heavy')
    onClick(assetId)
  }, [assetId, onClick])

  const volume24HValue = useMemo(() => {
    return bnOrZero(volume24H).isPositive() ? <Amount.Fiat value={volume24H} /> : <CText>N/A</CText>
  }, [volume24H])

  const green = useColorModeValue('green.500', 'green.200')

  const apyPercent = useMemo(() => bnOrZero(apy), [apy])
  const apyPercentValue = useMemo(
    () => <Amount.Percent autoColor value={bnOrZero(apy).times(0.01).toString()} />,
    [apy],
  )

  const apyPercentValueOrDefault = useMemo(() => {
    if (apyPercent.gt(10000)) return <Text color={green}>10,000%+</Text>

    return apyPercentValue
  }, [green, apyPercentValue, apyPercent])

  if (!asset) return null

  return (
    <CommonCard
      title={buildAssetTitle(asset, translate)}
      subtitle={asset.symbol}
      assetId={assetId}
      onClick={handleClick}
    >
      <HoverTooltip placement='top' label={apyPercentValue} isDisabled={apyPercent.lt(10000)}>
        <CommonStat value={apyPercentValueOrDefault} label={translate('common.apy')} />
      </HoverTooltip>
      <CommonStat
        value={volume24HValue}
        label={translate('assets.assetDetails.assetHeader.24HrVolume')}
        align='flex-end'
      />
    </CommonCard>
  )
}

export const LpGridItem = ({
  assetId,
  apy: _apy,
  volume,
  onClick,
  index,
}: {
  assetId: AssetId
  apy: string | undefined
  volume: string | undefined
  onClick: (assetId: AssetId) => void
  index: number
}) => {
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const volume24H = volume ?? marketData?.volume ?? '0'

  // TODO(gomes): remove weird branching between THOR and Portals - Portals assets should be upserted as a DeFi Opportunity, so we can select them from the same slice
  const opportunityMetadataFilter = useMemo(() => ({ assetId }), [assetId])
  const opportunityData = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )

  const apy =
    _apy ??
    bnOrZero(opportunityData?.apy)
      .times(100)
      .toString()

  return (
    <GridItem key={index}>
      <LpCard assetId={assetId} apy={apy ?? '0'} volume24H={volume24H} onClick={onClick} />
    </GridItem>
  )
}

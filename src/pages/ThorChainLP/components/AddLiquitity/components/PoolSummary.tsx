import { Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type PoolSummaryProps = {
  assetId: AssetId
  runePerAsset: string | undefined
  shareOfPoolDecimalPercent: string | undefined
}

export const PoolSummary = ({
  assetId,
  runePerAsset,
  shareOfPoolDecimalPercent,
}: PoolSummaryProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!asset) return null

  return (
    <Stack fontSize='sm' px={6} spacing={4} fontWeight='medium'>
      <RawText fontWeight='bold'>{translate('pools.initialPricesAndPoolShare')}</RawText>
      <Row>
        <Row.Label>
          {translate('pools.pricePerAsset', { from: 'RUNE', to: asset.symbol })}
        </Row.Label>
        <Row.Value>
          <Amount value={runePerAsset} />
        </Row.Value>
      </Row>
      <Row>
        <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
        <Row.Value>
          <Amount.Percent value={shareOfPoolDecimalPercent ?? '0'} />
        </Row.Value>
      </Row>
    </Stack>
  )
}

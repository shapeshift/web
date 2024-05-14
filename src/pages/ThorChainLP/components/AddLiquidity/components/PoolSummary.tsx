import { Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { selectAssetById } from 'state/selectors'
import { useAppSelector } from 'state/store'

type PoolSummaryProps = {
  assetId: AssetId
  runePerAsset: string | undefined
  shareOfPoolDecimalPercent: string | undefined
  isLoading: boolean
}

export const PoolSummary = ({
  assetId,
  runePerAsset,
  shareOfPoolDecimalPercent,
  isLoading,
}: PoolSummaryProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!asset) return null

  return (
    <Stack
      fontSize='sm'
      px={6}
      spacing={4}
      fontWeight='medium'
      mb={4}
      pt={4}
      borderTopWidth={1}
      borderColor='border.base'
    >
      <RawText fontWeight='bold'>{translate('pools.initialPricesAndPoolShare')}</RawText>
      <Row>
        <Row.Label>
          {translate('pools.pricePerAsset', { from: 'RUNE', to: asset.symbol })}
        </Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <Amount value={runePerAsset} />
          </Skeleton>
        </Row.Value>
      </Row>
      <Row>
        <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Percent
              options={{ maximumFractionDigits: 8 }}
              value={shareOfPoolDecimalPercent ?? '0'}
            />
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}

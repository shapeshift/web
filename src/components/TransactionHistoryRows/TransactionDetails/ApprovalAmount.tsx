import { Tag } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { makeAmountOrDefault } from '../utils'
import { Row } from './Row'
import { Text } from './Text'

export const ApprovalAmount = ({
  assetId,
  value,
  parser,
  variant = 'row',
}: {
  assetId: AssetId
  value: string
  parser: TxMetadata['parser'] | undefined
  variant?: 'row' | 'tag'
}) => {
  const translate = useTranslate()

  const approvedAsset = useAppSelector(state => selectAssetById(state, assetId))
  const approvedAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const amountOrDefault = useMemo(
    () => makeAmountOrDefault(value, approvedAssetMarketData, approvedAsset, parser),
    [parser, approvedAsset, approvedAssetMarketData, value],
  )

  if (variant === 'tag') {
    return (
      <Tag>
        <Text value={translate(amountOrDefault)} />
      </Tag>
    )
  }

  return (
    <Row title='approvalAmount'>
      <Text value={translate(amountOrDefault)} />
    </Row>
  )
}

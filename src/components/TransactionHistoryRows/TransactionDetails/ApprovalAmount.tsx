import type { AssetId } from '@shapeshiftoss/caip'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { makeAmountOrDefault } from '../utils'
import { Row } from './Row'
import { Text } from './Text'

export const ApprovalAmount = ({
  assetId,
  value,
  parser,
}: {
  assetId: AssetId
  value: string
  parser: TxMetadata['parser'] | undefined
}) => {
  const translate = useTranslate()

  const approvedAsset = useAppSelector(state => selectAssetById(state, assetId))
  const approvedAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const amountOrDefault = useMemo(
    () => makeAmountOrDefault(value, approvedAssetMarketData, approvedAsset, parser),
    [parser, approvedAsset, approvedAssetMarketData, value],
  )

  return (
    <Row title='approvalAmount'>
      <Text value={translate(amountOrDefault)} />
    </Row>
  )
}

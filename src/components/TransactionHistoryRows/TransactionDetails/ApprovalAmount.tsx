import { MaxUint256 } from '@ethersproject/constants'
import { AssetId } from '@shapeshiftoss/caip'
import { TxMetadata } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Row } from './Row'
import { Text } from './Text'

export const ApprovalAmount = ({
  assetId,
  value,
  isRevoke,
  parser,
}: {
  assetId: AssetId
  value: string
  isRevoke: boolean
  parser: TxMetadata['parser'] | undefined
}) => {
  const translate = useTranslate()

  const approvedAsset = useAppSelector(state => selectAssetById(state, assetId))
  const approvedAmount = bn(value).div(bn(10).pow(approvedAsset.precision)).toString()
  const approvedAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const amountOrDefault = useMemo(() => {
    if (isRevoke) return translate(`transactionRow.parser.${parser}.revoke`)
    // If equal to max. Solidity uint256 value or greater than/equal to max supply, we can infer infinite approvals without market data
    if (
      (approvedAssetMarketData.maxSupply &&
        bn(approvedAssetMarketData.maxSupply).gte(0) &&
        bn(approvedAmount).gte(approvedAssetMarketData.maxSupply)) ||
      bn(value).isEqualTo(MaxUint256.toString())
    )
      return translate(`transactionRow.parser.${parser}.infinite`)
    // We don't have market data for that asset thus can't know whether or not it's infinite
    if (bnOrZero(approvedAssetMarketData.supply).isZero()) return approvedAmount
    // We have market data and the approval is greater than it, so we can assume it's infinite
    if (bn(approvedAmount).gte(approvedAssetMarketData.supply ?? '0'))
      return translate(`transactionRow.parser.${parser}.infinite`)

    // All above infinite/revoke checks failed, this is an exact approval
    return `${approvedAmount} ${approvedAsset.symbol}`
  }, [
    parser,
    translate,
    isRevoke,
    approvedAmount,
    approvedAsset.symbol,
    approvedAssetMarketData,
    value,
  ])

  return (
    <Row title='approvalAmount'>
      <Text value={amountOrDefault} />
    </Row>
  )
}

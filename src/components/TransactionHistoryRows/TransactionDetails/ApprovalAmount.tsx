import { MaxUint256 } from '@ethersproject/constants'
import { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Row } from './Row'
import { Text } from './Text'

export const ApprovalAmount = ({
  assetId,
  value,
  isRevoke,
}: {
  assetId: AssetId
  value: string
  isRevoke: boolean
}) => {
  const approvedAsset = useAppSelector(state => selectAssetById(state, assetId))
  const approvedAmount = bn(value).div(bn(10).pow(approvedAsset.precision)).toString()
  const approvedAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const amountOrDefault = useMemo(() => {
    if (isRevoke) return 'Revoke'
    // If equal to max. Solidity uint256 value or greater than/equal to max supply, we can infer infinite approvals without market data
    if (
      (approvedAssetMarketData.maxSupply &&
        bn(approvedAssetMarketData.maxSupply).gte(0) &&
        bn(approvedAmount).gte(approvedAssetMarketData.maxSupply)) ||
      bn(value).isEqualTo(MaxUint256.toString())
    )
      return 'Infinite ∞'
    if (bnOrZero(approvedAssetMarketData.supply).isZero()) return approvedAmount // We don't have market data for that asset thus can't know if it's infinite
    if (bn(approvedAmount).gte(approvedAssetMarketData.supply ?? '0')) return 'Infinite ∞'

    return `${approvedAmount} ${approvedAsset.symbol}`
  }, [isRevoke, approvedAmount, approvedAsset.symbol, approvedAssetMarketData, value])

  return (
    <Row title='approvalAmount'>
      <Text value={amountOrDefault} />
    </Row>
  )
}

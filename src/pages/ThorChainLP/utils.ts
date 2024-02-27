import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { AsymSide } from 'lib/utils/thorchain/lp/types'

export type OpportunityType = AsymSide | 'sym'

export type Opportunity = {
  assetId: AssetId
  type: OpportunityType
}

export const fromOpportunityId = (opportunityId: string): Opportunity => {
  const [assetId, type] = opportunityId.split('*')
  fromAssetId(assetId)

  return {
    assetId: assetId as AssetId,
    type: type as OpportunityType,
  }
}

export const toOpportunityId = ({ assetId, type }: Opportunity) => {
  return `${assetId}*${type}`
}

export const getPositionName = (poolName: string, opportunityId: string) => {
  const { type } = fromOpportunityId(opportunityId)
  const [asset, rune] = poolName.split('/')
  if (type === AsymSide.Asset) return asset
  if (type === AsymSide.Rune) return rune
  return poolName
}

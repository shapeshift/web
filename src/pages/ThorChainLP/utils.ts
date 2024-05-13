import { captureException, setContext } from '@sentry/react'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { AsymSide } from 'lib/utils/thorchain/lp/types'

export type OpportunityType = AsymSide | 'sym'

export type Opportunity = {
  assetId: AssetId
  type: OpportunityType
}

export const fromOpportunityId = (opportunityId: string): Opportunity => {
  const [assetId, type] = opportunityId.split('*')

  if (!assetId || !type) throw new Error(`Invalid opportunityId: ${opportunityId}`)

  try {
    fromAssetId(assetId)
  } catch (e) {
    console.error('Invalid assetId', assetId)
    setContext('fromAssetIdArgs', { assetId })
    captureException(e)
    throw e
  }

  return {
    assetId: assetId as AssetId,
    type: type as OpportunityType,
  }
}

export const toOpportunityId = ({ assetId, type }: Opportunity) => {
  return `${assetId}*${type}`
}

import { captureException, setContext } from '@sentry/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type {
  AsymSide,
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import { isLpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/utils'

export type OpportunityType = AsymSide | 'sym'

export type Opportunity = {
  assetId: AssetId
  opportunityType: OpportunityType
}

export type LpOpportunityIntent = Opportunity & {
  actionSide: OpportunityType
  action: 'withdraw' | 'deposit'
}

export const fromOpportunityId = (opportunityId: string): Opportunity => {
  const [assetId, opportunityType] = opportunityId.split('*')

  if (!assetId || !opportunityType) throw new Error(`Invalid opportunityId: ${opportunityId}`)

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
    opportunityType: opportunityType as OpportunityType,
  }
}

export const toOpportunityId = ({ assetId, opportunityType }: Opportunity) => {
  return `${assetId}*${opportunityType}`
}

export const fromQuote = <T extends LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote>(
  quote: T,
): LpOpportunityIntent => {
  const { assetId, opportunityType } = fromOpportunityId(quote.opportunityId)
  if (isLpConfirmedDepositQuote(quote)) {
    return {
      assetId,
      actionSide: opportunityType,
      opportunityType,
      action: 'deposit',
    }
  }

  return {
    assetId,
    actionSide: quote.withdrawSide,
    opportunityType,
    action: 'withdraw',
  }
}

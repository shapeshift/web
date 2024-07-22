import { captureException, setContext } from '@sentry/react'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  AsymSide,
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import { isLpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/utils'

export type OpportunityType = AsymSide | 'sym'

export type Opportunity = {
  assetId: AssetId
  type: OpportunityType
}

export type WithdrawOpportunityIntent = Omit<Opportunity, 'type'> & {
  depositType?: never
  withdrawType: OpportunityType
}
export type DepositOpportunityIntent = Omit<Opportunity, 'type'> & {
  depositType: OpportunityType
  withdrawType?: never
}

export type LpOpportunityIntent = DepositOpportunityIntent | WithdrawOpportunityIntent

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

export const fromQuote = <T extends LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote>(
  quote: T,
): LpOpportunityIntent => {
  const { assetId, type } = fromOpportunityId(quote.opportunityId)
  if (isLpConfirmedDepositQuote(quote)) {
    return {
      assetId,
      depositType: type,
    }
  }

  return {
    assetId,
    withdrawType: quote.withdrawSide,
  }
}

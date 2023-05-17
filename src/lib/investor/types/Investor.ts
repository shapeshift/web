import type { InvestorOpportunity } from 'lib/investor/types/InvestorOpportunity'

export interface Investor<TxType = unknown, MetaData = unknown> {
  initialize: () => Promise<void>
  findAll: () => Promise<InvestorOpportunity<TxType, MetaData>[]>
  findByOpportunityId: (
    opportunityId: string,
  ) => Promise<InvestorOpportunity<TxType, MetaData> | undefined>
  findByUnderlyingAssetId: (assetId: string) => Promise<InvestorOpportunity<TxType, MetaData>[]>
}

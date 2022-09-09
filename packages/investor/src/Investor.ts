import { InvestorOpportunity } from './InvestorOpportunity'

export interface Investor<TxType = unknown, MetaData = unknown> {
  initialize: () => Promise<void>
  findAll: () => Promise<InvestorOpportunity<TxType, MetaData>[]>
  findByOpportunityId: (
    opportunityId: string,
  ) => Promise<InvestorOpportunity<TxType, MetaData> | undefined>
  findByUnderlyingAssetId: (assetId: string) => Promise<InvestorOpportunity<TxType, MetaData>[]>
}

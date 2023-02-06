import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type {
  LpEarnOpportunityType,
  OpportunityId,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'

export type EarnOpportunityType = {
  type?: string
  provider: string
  version?: string
  contractAddress?: string
  rewardAddress: string
  apy?: number | string
  tvl: string
  underlyingAssetId?: AssetId
  assetId: AssetId
  id: OpportunityId
  fiatAmount: string
  /** @deprecated use cryptoAmountBaseUnit instead and derive precision amount from it*/
  cryptoAmountPrecision: string
  cryptoAmountBaseUnit: string
  expired?: boolean
  chainId: ChainId
  showAssetSymbol?: boolean
  isLoaded: boolean
  icons?: string[]
  // overrides any name down the road
  opportunityName?: string
  highestBalanceAccountAddress?: string // FOX/ETH specific, let's change it to accountId across the line if we need it for other opportunities
}

export type NormalizeOpportunitiesProps = {
  stakingOpportunities?: StakingEarnOpportunityType[]
  lpOpportunities?: LpEarnOpportunityType[]
}

export const useNormalizeOpportunities = ({
  stakingOpportunities,
  lpOpportunities,
}: NormalizeOpportunitiesProps): EarnOpportunityType[] => {
  return [
    ...(stakingOpportunities ? stakingOpportunities : []),
    ...(lpOpportunities ? lpOpportunities : []),
  ]
}

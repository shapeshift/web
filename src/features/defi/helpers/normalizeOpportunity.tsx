import type { AssetId, ChainId } from '@shapeshiftoss/caip'

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

type NormalizeOpportunitiesProps = {
  stakingOpportunities?: EarnOpportunityType[]
  lpOpportunities?: EarnOpportunityType[]
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

import { CAIP19 } from '@shapeshiftoss/caip'
import {
  AssetAccountDetails,
  AssetOpportunities,
  DefaultAssetDetails
} from 'components/AssetAccountDetails'
import { StakingOpportunities } from 'components/Delegate/StakingOpportunities'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectFeatureFlag } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const CosmosAssetAccountDetails = ({ assetId: caip19, accountId }: AssetDetailsProps) => {
  const cosmosInvestorFlag = useAppSelector(state => selectFeatureFlag(state, 'CosmosInvestor'))

  return (
    <AssetAccountDetails assetId={caip19} accountId={accountId}>
      <DefaultAssetDetails />
      <AssetOpportunities>{cosmosInvestorFlag && <StakingOpportunities />}</AssetOpportunities>
    </AssetAccountDetails>
  )
}

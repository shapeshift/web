import { CAIP19 } from '@shapeshiftoss/caip'
import {
  AssetAccountDetails,
  AssetOpportunities,
  DefaultAssetDetails
} from 'components/AssetAccountDetails'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { EarnOpportunities } from '../../components/StakingVaults/EarnOpportunities'
import { UnderlyingToken } from '../../components/UnderlyingToken'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const EthereumAssetAccountDetails = ({ assetId: caip19, accountId }: AssetDetailsProps) => {
  return (
    <AssetAccountDetails assetId={caip19} accountId={accountId}>
      <DefaultAssetDetails />
      <AssetOpportunities>
        <EarnOpportunities assetId={caip19} accountId={accountId} />
        <UnderlyingToken assetId={caip19} accountId={accountId} />
      </AssetOpportunities>
    </AssetAccountDetails>
  )
}

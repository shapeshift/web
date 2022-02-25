import { caip19 } from '@shapeshiftoss/caip'
import { ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useHistory, useLocation } from 'react-router'
import { EarnOpportunityRow } from 'components/StakingVaults/EarnOpportunityRow'

type FoxyOpportunityRowProps = {
  isLoaded?: boolean
  index: number
  showTeaser?: boolean
} & EarnOpportunityType

export const FoxyOpportunityRow = (opportunity: FoxyOpportunityRowProps) => {
  const { chain, tokenAddress, contractAddress } = opportunity
  const history = useHistory()
  const location = useLocation()
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: tokenAddress })

  const handleClick = () => {
    history.push({
      pathname: `/defi/token-staking/foxy/withdraw`,
      search: qs.stringify({
        chain,
        contractAddress,
        tokenId: tokenAddress
      }),
      state: { background: location }
    })
  }

  if (!assetCAIP19) return null
  return (
    <EarnOpportunityRow
      {...opportunity}
      assetId={assetCAIP19}
      onClick={handleClick}
      fiatAmount={'100'}
      cryptoAmount={'100'}
    />
  )
}

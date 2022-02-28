import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useHistory, useLocation } from 'react-router'
import { EarnOpportunityRow } from 'components/StakingVaults/EarnOpportunityRow'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

export type YearnVaultProps = {
  isLoaded?: boolean
  index: number
  showTeaser?: boolean
} & EarnOpportunityType

export const YearnVaultRow = (opportunity: YearnVaultProps) => {
  const { type, provider, contractAddress, chain, tokenAddress } = opportunity
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()

  const handleClick = () => {
    if (isConnected) {
      history.push({
        pathname: `/defi/${type}/${provider}/deposit`,
        search: qs.stringify({
          chain,
          contractAddress,
          tokenId: tokenAddress
        }),
        state: { background: location }
      })
    } else {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    }
  }

  return <EarnOpportunityRow {...opportunity} onClick={handleClick} />
}

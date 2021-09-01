import { SwapCurrency } from '@shapeshiftoss/market-service'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'
import { useHistory } from 'react-router-dom'

export const AssetSidebar = ({ onToggle }: LeftSidebarChildProps) => {
  const history = useHistory()
  const onClick = (asset: SwapCurrency) => {
    history.push(`/assets/ethereum/${asset.address}`)
    onToggle && onToggle()
  }
  return <AssetSearch onClick={onClick} />
}

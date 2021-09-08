import { Asset } from '@shapeshiftoss/asset-service'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'
import { useHistory } from 'react-router-dom'

export const AssetSidebar = ({ onToggle }: LeftSidebarChildProps) => {
  const history = useHistory()
  const onClick = (asset: Asset) => {
    history.push(`/assets/ethereum/${asset.tokenId}`)
    onToggle && onToggle()
  }
  return <AssetSearch onClick={onClick} />
}

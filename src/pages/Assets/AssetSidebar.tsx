import { Asset } from '@shapeshiftoss/asset-service'
import { useHistory } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'

export const AssetSidebar = ({ onToggle }: LeftSidebarChildProps) => {
  const history = useHistory()
  const onClick = (asset: Asset) => {
    const url = asset.tokenId ? `/assets/${asset.chain}/${asset.tokenId}` : `/assets/${asset.chain}`
    history.push(url) // TODO deploy this
    onToggle && onToggle()
  }
  return <AssetSearch onClick={onClick} />
}

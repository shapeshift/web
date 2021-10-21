import { assetService } from '@shapeshiftoss/types'
import { useHistory } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'

export const AssetSidebar = ({ onToggle }: LeftSidebarChildProps) => {
  const history = useHistory()
  const onClick = (asset: assetService.Asset) => {
    const url = asset.tokenId ? `/assets/${asset.chain}/${asset.tokenId}` : `/assets/${asset.chain}`
    history.push(url)
    onToggle && onToggle()
  }
  return <AssetSearch onClick={onClick} />
}

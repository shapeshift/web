import { Asset } from '@shapeshiftoss/types'
import { useNavigate } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'

export const AssetSidebar = ({ onToggle }: LeftSidebarChildProps) => {
  const navigate = useNavigate()
  const onClick = (asset: Asset) => {
    const url = asset.tokenId ? `/assets/${asset.chain}/${asset.tokenId}` : `/assets/${asset.chain}`
    navigate(url)
    onToggle && onToggle()
  }
  return <AssetSearch onClick={onClick} />
}

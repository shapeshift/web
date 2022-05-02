import { Asset } from '@shapeshiftoss/types'
import { useHistory } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'

export const AssetSidebar = ({ onToggle }: LeftSidebarChildProps) => {
  const history = useHistory()
  const onClick = (asset: Asset) => {
    // @see onClick handler in `src/pages/Assets/Assets.tsx` - this needs to work the same
    const url = `/assets/${asset.assetId}`
    history.push(url)
    onToggle && onToggle()
  }
  return <AssetSearch onClick={onClick} />
}

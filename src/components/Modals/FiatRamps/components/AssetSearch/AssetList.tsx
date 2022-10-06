import type { ListProps } from '@chakra-ui/react'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'

import type { FiatRampAction, FiatRampAsset } from '../../FiatRampsCommon'
import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (asset: FiatRampAsset) => void
  assets: FiatRampAsset[]
  type: FiatRampAction
} & ListProps

export const AssetList = ({ assets, type, handleClick }: AssetListProps) => {
  if (!assets.length) return <Text translation='common.noResultsFound' />

  return (
    <FixedSizeList
      itemSize={60}
      height={250}
      width='100%'
      itemData={{
        items: assets,
        type,
        handleClick,
      }}
      itemCount={assets.length}
      className='token-list'
      overscanCount={6}
    >
      {AssetRow}
    </FixedSizeList>
  )
}

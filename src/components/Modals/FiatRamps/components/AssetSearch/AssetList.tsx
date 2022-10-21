import type { ListProps } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'

import type { FiatRampAction } from '../../FiatRampsCommon'
import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (assetId: AssetId) => void
  assetIds: AssetId[]
  action: FiatRampAction
} & ListProps

export const AssetList: React.FC<AssetListProps> = props => {
  if (!props.assetIds.length) return <Text translation='common.noResultsFound' />

  return (
    <FixedSizeList
      itemSize={60}
      height={250}
      width='100%'
      itemData={props}
      itemCount={props.assetIds.length}
      className='token-list'
      overscanCount={6}
    >
      {AssetRow}
    </FixedSizeList>
  )
}

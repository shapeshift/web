import { ListProps } from '@chakra-ui/react'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'

import { FiatRampAction } from '../../const'
import { GemCurrency } from '../../FiatRampsCommon'
import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (asset: GemCurrency) => void
  assets: GemCurrency[]
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
        type: type,
        handleClick,
      }}
      itemCount={assets.length}
      className='token-list scroll-container'
      overscanCount={6}
    >
      {AssetRow}
    </FixedSizeList>
  )
}

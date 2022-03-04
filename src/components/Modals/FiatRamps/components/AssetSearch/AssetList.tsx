import { ListProps } from '@chakra-ui/react'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'

import { BuySellAction, CurrencyAsset } from '../../FiatRamps'
import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (asset: CurrencyAsset) => void
  assets: CurrencyAsset[]
  type: BuySellAction
} & ListProps

export const AssetList = ({ assets, type, handleClick }: AssetListProps) => {
  return !assets.length ? (
    <Text translation='common.noResultsFound' />
  ) : (
    <FixedSizeList
      itemSize={60}
      height={250}
      width='100%'
      itemData={{
        items: assets,
        type: type,
        handleClick
      }}
      itemCount={assets.length}
      className='token-list scroll-container'
      overscanCount={6}
    >
      {AssetRow}
    </FixedSizeList>
  )
}

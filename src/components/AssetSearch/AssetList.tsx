import { ListProps } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'
import { useRefCallback } from 'hooks/useRefCallback/useRefCallback'
import { MatchParams } from 'pages/Accounts/Account'

import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (asset: Asset) => void
  assets: Asset[]
} & ListProps

type ItemData<T> = {
  items: Asset[]
  handleClick: T
}

export const AssetList = ({ assets, handleClick }: AssetListProps) => {
  type HandleClick = ReturnType<typeof handleClick>

  const { assetId } = useParams<MatchParams>()
  const parsedAssetId = assetId ? decodeURIComponent(assetId) : undefined
  const [tokenListRef, setTokenListRef] = useRefCallback<FixedSizeList<ItemData<HandleClick>>>({
    onInit: node => {
      if (!node) return
      const index = node.props.itemData?.items.findIndex(
        ({ assetId }: Asset) => assetId === parsedAssetId,
      )
      if (typeof index === 'number' && index >= 0) {
        node.scrollToItem?.(index, 'center')
      }
    },
  })

  useEffect(() => {
    if (!tokenListRef) return
    tokenListRef?.scrollTo(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets])

  return (
    <AutoSizer disableWidth className='auto-sizered'>
      {({ height }) =>
        assets?.length === 0 ? (
          <Text translation='common.noResultsFound' />
        ) : (
          <FixedSizeList
            itemSize={60}
            height={height}
            width='100%'
            itemData={{
              items: assets,
              handleClick,
            }}
            itemCount={assets.length}
            ref={setTokenListRef}
            className='token-list scroll-container'
            overscanCount={6}
          >
            {AssetRow}
          </FixedSizeList>
        )
      }
    </AutoSizer>
  )
}

import type { ListProps } from '@chakra-ui/react'
import { Center } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { useEffect } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'
import { useRefCallback } from 'hooks/useRefCallback/useRefCallback'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'

import { AssetRow } from './AssetRow'

export type AssetData = {
  assets: Asset[]
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
}

type AssetListProps = AssetData & ListProps

export const AssetList = ({
  assets,
  handleClick,
  disableUnsupported = false,
  hideZeroBalanceAmounts = true,
}: AssetListProps) => {
  const assetId = useRouteAssetId()
  const [tokenListRef, setTokenListRef] = useRefCallback<FixedSizeList<AssetData>>({
    deps: [assetId],
    onInit: node => {
      if (!node) return
      const parsedAssetId = assetId ? decodeURIComponent(assetId) : undefined
      const index = node.props.itemData?.assets.findIndex(
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
          <Center>
            <Text color='gray.500' translation='common.noResultsFound' />
          </Center>
        ) : (
          <FixedSizeList
            itemSize={60}
            height={height}
            width='100%'
            itemData={{
              assets,
              handleClick,
              disableUnsupported,
              hideZeroBalanceAmounts,
            }}
            itemCount={assets.length}
            ref={setTokenListRef}
            className='token-list'
            overscanCount={6}
          >
            {AssetRow}
          </FixedSizeList>
        )
      }
    </AutoSizer>
  )
}

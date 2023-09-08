import type { ListProps } from '@chakra-ui/react'
import { Center } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Size } from 'react-virtualized-auto-sizer'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'
import { useRefCallback } from 'hooks/useRefCallback/useRefCallback'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { Asset } from 'lib/asset-service'

import { AssetRow } from './AssetRow'

export type AssetData = {
  assets: Asset[]
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
}

type AssetListProps = AssetData & ListProps

export const AssetList: FC<AssetListProps> = ({
  assets,
  handleClick,
  disableUnsupported = false,
  hideZeroBalanceAmounts = true,
}) => {
  const assetId = useRouteAssetId()
  const tokenListRef = useRef<FixedSizeList<AssetData> | null>(null)

  useRefCallback<FixedSizeList<AssetData>>({
    deps: [assetId],
    onInit: node => {
      if (!node) return
      tokenListRef.current = node
    },
  })

  useEffect(() => {
    if (!tokenListRef.current) return
    const parsedAssetId = assetId ? decodeURIComponent(assetId) : undefined
    const index = tokenListRef.current.props.itemData?.assets.findIndex(
      ({ assetId }: Asset) => assetId === parsedAssetId,
    )
    if (typeof index === 'number' && index >= 0) {
      tokenListRef.current.scrollToItem(index, 'center')
    }
  }, [assetId, assets])

  useEffect(() => {
    if (!tokenListRef.current) return
    tokenListRef.current.scrollTo(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets])

  const itemData = useMemo(
    () => ({
      assets,
      handleClick,
      disableUnsupported,
      hideZeroBalanceAmounts,
    }),
    [assets, disableUnsupported, handleClick, hideZeroBalanceAmounts],
  )

  const renderContent = useCallback(
    ({ height }: Size) => {
      if (assets?.length === 0) {
        return (
          <Center>
            <Text color='text.subtle' translation='common.noResultsFound' />
          </Center>
        )
      }

      return (
        <FixedSizeList
          itemSize={60}
          height={height}
          width='100%'
          itemData={itemData}
          itemCount={assets.length}
          ref={tokenListRef}
          className='token-list'
          overscanCount={3}
        >
          {AssetRow}
        </FixedSizeList>
      )
    },
    [assets.length, itemData],
  )

  return (
    <AutoSizer disableWidth className='auto-sizered'>
      {renderContent}
    </AutoSizer>
  )
}

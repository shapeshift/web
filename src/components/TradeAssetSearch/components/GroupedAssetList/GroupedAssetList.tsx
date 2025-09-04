import { Box, Center } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import type { ItemProps, TopItemListProps } from 'react-virtuoso'
import { GroupedVirtuoso } from 'react-virtuoso'

import { GroupedAssetRowLoading } from './GroupedAssetRowLoading'

import { INCREASE_VIEWPORT_BY } from '@/components/AssetSearch/components/AssetList'
import { AssetRow } from '@/components/AssetSearch/components/AssetRow'
import { Text } from '@/components/Text'

const Footer = () => <Box height='0.5rem' />
const TopItemList = ({ children }: TopItemListProps) => <div>{children}</div> // this cannot be Fragment as styles are applied
const VirtuosoItem = ({ children }: ItemProps<React.FC>) => (
  <Box px={2} width='100%' minHeight='64px'>
    {children}
  </Box>
)
const components = { TopItemList, Footer, Item: VirtuosoItem }

const backgroundColor = { base: 'background.surface.base', md: 'background.surface.overlay.base' }
const style = { minHeight: '50vh' }

export type GroupedAssetListProps = {
  assets: Asset[]
  groups: string[]
  groupCounts: number[]
  groupIsLoading: boolean[]
  onAssetClick: (asset: Asset) => void
  onImportClick?: (asset: Asset) => void
  hideZeroBalanceAmounts: boolean
}

export const GroupedAssetList = ({
  assets,
  groups,
  groupCounts,
  groupIsLoading,
  onAssetClick,
  onImportClick,
  hideZeroBalanceAmounts,
}: GroupedAssetListProps) => {
  const renderGroupContent = useCallback(
    (index: number) => {
      return (
        <>
          <Text
            backgroundColor={backgroundColor}
            color='text.subtle'
            fontWeight='medium'
            pt={4}
            pb={4}
            px={6}
            translation={groups[index]}
          />
          {!groupIsLoading[index] && groupCounts[index] <= 0 && (
            <Center>
              <Text color='text.subtle' translation={'common.noResultsFound'} />
            </Center>
          )}
          {groupIsLoading[index] && (
            <>
              <GroupedAssetRowLoading />
              <GroupedAssetRowLoading />
              <GroupedAssetRowLoading />
            </>
          )}
        </>
      )
    },
    [groups, groupCounts, groupIsLoading],
  )

  const renderItem = useCallback(
    (index: number) => {
      const asset = assets[index]

      const itemData = {
        assets: [asset],
        handleClick: onAssetClick,
        disableUnsupported: false,
        hideZeroBalanceAmounts,
        onImportClick,
      }

      return (
        <AssetRow
          asset={asset}
          index={index}
          // eslint-disable-next-line react-memo/require-usememo
          data={itemData}
          onImportClick={onImportClick}
          shouldDisplayRelatedAssets
        />
      )
    },
    [assets, onAssetClick, onImportClick, hideZeroBalanceAmounts],
  )

  return (
    <GroupedVirtuoso
      groupCounts={groupCounts}
      groupContent={renderGroupContent}
      itemContent={renderItem}
      components={components}
      style={style}
      overscan={200}
      increaseViewportBy={INCREASE_VIEWPORT_BY}
    />
  )
}

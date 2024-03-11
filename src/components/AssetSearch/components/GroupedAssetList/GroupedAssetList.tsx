import { Box, Center } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import type { TopItemListProps } from 'react-virtuoso'
import { GroupedVirtuoso } from 'react-virtuoso'
import { Text } from 'components/Text'

import { GroupedAssetRow } from './components/GroupedAssetRow'
import { GroupedAssetRowLoading } from './components/GroupedAssetRowLoading'

const Footer = () => <Box height='0.5rem' />
const TopItemList = ({ children }: TopItemListProps) => <div>{children}</div> // this cannot be Fragment as styles are applied
const components = { TopItemList, Footer }

export type GroupedAssetListProps = {
  assets: Asset[]
  groups: string[]
  groupCounts: number[]
  groupIsLoading: boolean[]
  onClickItem: (asset: Asset) => void
  hideZeroBalanceAmounts: boolean
}

export const GroupedAssetList = ({
  assets,
  groups,
  groupCounts,
  groupIsLoading,
  onClickItem,
  hideZeroBalanceAmounts,
}: GroupedAssetListProps) => {
  const renderGroupContent = useCallback(
    (index: number) => {
      return (
        <>
          <Text
            backgroundColor='background.surface.overlay.base'
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
    [groupCounts, groups, groupIsLoading],
  )

  const renderItem = useCallback(
    (index: number) => {
      return (
        <GroupedAssetRow
          index={index}
          onClick={onClickItem}
          assets={assets}
          hideZeroBalanceAmounts={hideZeroBalanceAmounts}
        />
      )
    },
    [assets, hideZeroBalanceAmounts, onClickItem],
  )

  return (
    <GroupedVirtuoso
      groupCounts={groupCounts}
      groupContent={renderGroupContent}
      itemContent={renderItem}
      components={components}
    />
  )
}

import { Box, Center, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import type { ItemProps, TopItemListProps } from 'react-virtuoso'
import { GroupedVirtuoso, Virtuoso } from 'react-virtuoso'

import { GroupedAssetRowLoading } from './GroupedAssetRowLoading'

import { INCREASE_VIEWPORT_BY } from '@/components/AssetSearch/components/AssetList'
import { AssetRow } from '@/components/AssetSearch/components/AssetRow'
import { Text } from '@/components/Text'
import { FiatRow } from '@/components/TradeAssetSearch/components/FiatRow'
import type { FiatTypeEnumWithoutCryptos } from '@/constants/fiats'
import { FIATS } from '@/constants/fiats'

const Footer = () => <Box height='0.5rem' />
const TopItemList = ({ children }: TopItemListProps) => <div>{children}</div> // this cannot be Fragment as styles are applied
const VirtuosoItem = ({ children }: ItemProps<React.FC>) => (
  <Box px={2} width='100%' minHeight='64px'>
    {children}
  </Box>
)
const components = { TopItemList, Footer, Item: VirtuosoItem }

const backgroundColor = { base: 'background.surface.base', md: 'background.surface.overlay.base' }
const style = { minHeight: 'calc(50vh + 40px)' }

const textSelectedProps = {
  color: 'text.base',
}

export type GroupedAssetListProps = {
  assets: Asset[]
  groups: string[]
  groupCounts: number[]
  groupIsLoading: boolean[]
  onAssetClick: (asset: Asset) => void
  onFiatClick?: (fiat: FiatTypeEnumWithoutCryptos) => void
  onImportClick?: (asset: Asset) => void
  hideZeroBalanceAmounts: boolean
  activeChainId: ChainId | 'All'
  showFiatAssets?: boolean
}

export const GroupedAssetList = ({
  assets,
  groups,
  groupCounts,
  groupIsLoading,
  onAssetClick,
  onFiatClick,
  onImportClick,
  hideZeroBalanceAmounts,
  activeChainId,
  showFiatAssets = false,
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
          showRelatedAssets={activeChainId === 'All'}
        />
      )
    },
    [assets, onAssetClick, hideZeroBalanceAmounts, onImportClick, activeChainId],
  )

  const renferFiatItem = useCallback(
    (index: number) => {
      const fiat = FIATS[index]
      return <FiatRow key={fiat} fiat={fiat} onClick={onFiatClick} />
    },
    [onFiatClick],
  )

  if (showFiatAssets) {
    return (
      <Tabs
        variant='unstyled'
        display='flex'
        flexDirection='column'
        height='100%'
        mt={4}
        pe={1}
        pb={8}
        isLazy
      >
        <TabList gap={4} flex='0 0 auto' mb={2} ml={4}>
          <Tab
            p={0}
            fontSize='md'
            fontWeight='bold'
            color='text.subtle'
            _selected={textSelectedProps}
          >
            <Text translation='common.crypto' />
          </Tab>
          <Tab
            p={0}
            fontSize='md'
            fontWeight='bold'
            color='text.subtle'
            _selected={textSelectedProps}
          >
            <Text translation='common.fiat' />
          </Tab>
        </TabList>
        <TabPanels height='100%'>
          <TabPanel px={0} py={0} height='100%'>
            <GroupedVirtuoso
              className='scroll-container'
              groupCounts={groupCounts}
              groupContent={renderGroupContent}
              itemContent={renderItem}
              components={components}
              style={style}
              overscan={200}
              increaseViewportBy={INCREASE_VIEWPORT_BY}
            />
          </TabPanel>

          <TabPanel px={0} py={0} height='100%'>
            <Virtuoso
              className='scroll-container'
              data={FIATS}
              itemContent={renferFiatItem}
              style={style}
              overscan={1000}
              increaseViewportBy={INCREASE_VIEWPORT_BY}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    )
  }

  return (
    <GroupedVirtuoso
      className='scroll-container'
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

import { CheckIcon } from '@chakra-ui/icons'
import { Box, Icon, Menu, MenuItemOption, MenuOptionGroup } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ChainOptionGroup } from './ChainOptionGroup'
import { SortOptionGroup } from './SortOptionGroup'

import { Dialog } from '@/components/Modal/components/Dialog'
import { OrderDirection } from '@/components/OrderDropdown/types'
import type { SortOptionsKeys } from '@/components/SortDropdown/types'
import { Text } from '@/components/Text'
import type { MarketsCategories } from '@/pages/Markets/constants'

const checkedIcon = <Icon as={CheckIcon} color='blue.200' fontSize='20px' />

type HighlightedTokensFiltersDialogProps = {
  isOpen: boolean
  onClose: () => void
  selectedCategory: MarketsCategories
  selectedSort: SortOptionsKeys
  selectedOrder: OrderDirection
  selectedChainId: ChainId | 'all'
  handleSortChange: (sort: SortOptionsKeys) => void
  handleOrderChange: (order: OrderDirection) => void
  handleChainIdChange: (chainId: ChainId | 'all') => void
}
export const AssetListFiltersDialog = ({
  isOpen,
  onClose,
  selectedCategory,
  selectedSort,
  selectedOrder,
  selectedChainId,
  handleSortChange,
  handleOrderChange,
  handleChainIdChange,
}: HighlightedTokensFiltersDialogProps) => {
  const translate = useTranslate()

  const filters = useMemo(() => {
    return (
      <Menu>
        <SortOptionGroup
          selectedCategory={selectedCategory}
          selectedSort={selectedSort}
          handleSortChange={handleSortChange}
        />

        <Text translation='common.orderBy' mb={2} color='text.primary' fontWeight='bold' />
        <Box backgroundColor='background.surface.raised.base' borderRadius='10' p={2} mb={4}>
          <MenuOptionGroup type='radio' value={selectedOrder}>
            <MenuItemOption
              value={OrderDirection.Descending}
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => handleOrderChange(OrderDirection.Descending)}
              fontSize='md'
              iconPlacement='end'
              icon={checkedIcon}
              fontWeight='bold'
              color={selectedOrder === OrderDirection.Descending ? 'text.primary' : 'text.subtle'}
            >
              {translate('common.descending')}
            </MenuItemOption>
            <MenuItemOption
              value={OrderDirection.Ascending}
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => handleOrderChange(OrderDirection.Ascending)}
              fontSize='md'
              iconPlacement='end'
              icon={checkedIcon}
              fontWeight='bold'
              color={selectedOrder === OrderDirection.Ascending ? 'text.primary' : 'text.subtle'}
            >
              {translate('common.ascending')}
            </MenuItemOption>
          </MenuOptionGroup>
        </Box>

        <ChainOptionGroup
          selectedCategory={selectedCategory}
          selectedChainId={selectedChainId}
          handleChainChange={handleChainIdChange}
        />
      </Menu>
    )
  }, [
    handleSortChange,
    selectedSort,
    translate,
    selectedCategory,
    selectedOrder,
    selectedChainId,
    handleOrderChange,
    handleChainIdChange,
  ])

  return (
    <Dialog id='asset-list-filters-dialog' isOpen={isOpen} onClose={onClose} height='auto'>
      <Box height='5px' width='36px' borderRadius='full' bg='gray.500' mb={4} mx='auto' my={4} />
      <Box
        pb='calc(env(safe-area-inset-bottom) + var(--safe-area-inset-bottom) + var(--chakra-space-4))'
        px={4}
        overflowY='scroll'
        maxHeight='100vh'
      >
        {filters}
      </Box>
    </Dialog>
  )
}

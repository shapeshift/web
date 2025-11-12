import { CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { TbAdjustmentsHorizontal } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { OrderDirection } from '@/components/OrderDropdown/types'
import type { SortOptionsKeys } from '@/components/SortDropdown/types'
import { RawText, Text } from '@/components/Text'
import { MarketsCategories } from '@/pages/Markets/constants'

const buttonHoverProps = { bg: 'transparent', color: 'text.base' }
const settingsIcon = <TbAdjustmentsHorizontal />
const checkedIcon = <Icon as={CheckIcon} color='blue.200' fontSize='20px' />
const menuButtonHoverProps = { bg: 'background.surface.raised.hover' }

type CategoryMenuItemProps = {
  category: MarketsCategories
  selectedCategory: MarketsCategories
  onClick: () => void
  checkedIcon: React.ReactElement
}

const CategoryMenuItem = ({
  category,
  selectedCategory,
  onClick,
  checkedIcon,
}: CategoryMenuItemProps) => {
  const translate = useTranslate()

  const label = useMemo(() => {
    return category === MarketsCategories.OneClickDefi
      ? translate(`markets.categories.${category}.filterTitle`)
      : translate(`markets.categories.${category}.title`)
  }, [category, translate])

  return (
    <MenuItemOption
      value={category}
      onClick={onClick}
      fontSize='sm'
      iconPlacement='end'
      icon={checkedIcon}
      color={selectedCategory === category ? 'text.primary' : 'text.subtle'}
    >
      {label}
    </MenuItemOption>
  )
}

type TopAssetsFiltersPopoverProps = {
  isLoading: boolean
  selectedCategory: MarketsCategories
  selectedOrder: OrderDirection
  selectedSort: SortOptionsKeys
  categoryLabel: string
  orderLabel: string
  sortOptions: SortOptionsKeys[] | undefined
  handleCategoryChange: (category: MarketsCategories) => () => void
  handleSortOptionClick: (sortOption: SortOptionsKeys) => () => void
  handleOrderChange: (order: OrderDirection) => void
}

export const TopAssetsFiltersPopover = ({
  isLoading,
  selectedCategory,
  selectedOrder,
  selectedSort,
  categoryLabel,
  orderLabel,
  sortOptions,
  handleCategoryChange,
  handleSortOptionClick,
  handleOrderChange,
}: TopAssetsFiltersPopoverProps) => {
  const translate = useTranslate()

  const handleAscendingOrderChange = useCallback(() => {
    handleOrderChange(OrderDirection.Ascending)
  }, [handleOrderChange])

  const handleDescendingOrderChange = useCallback(() => {
    handleOrderChange(OrderDirection.Descending)
  }, [handleOrderChange])

  return (
    <Flex
      zIndex={99}
      height={12}
      alignItems='center'
      justifyContent='center'
      bg='background.surface.raised.base'
      width='auto'
      aspectRatio='1/1'
    >
      <Popover placement='top-end' closeOnBlur={true} returnFocusOnClose={false}>
        <PopoverTrigger>
          <IconButton
            aria-label={translate('common.settings')}
            icon={settingsIcon}
            size='md'
            fontSize='xl'
            variant='ghost'
            isLoading={isLoading}
            _hover={buttonHoverProps}
            _active={buttonHoverProps}
          />
        </PopoverTrigger>
        <PopoverContent zIndex={1001} width='280px'>
          <PopoverBody p={4}>
            <Flex flexDirection='column' gap={4}>
              <Box>
                <Text
                  translation='common.list'
                  mb={2}
                  color='text.primary'
                  fontWeight='bold'
                  fontSize='sm'
                />
                <Menu>
                  <MenuButton
                    as={Box}
                    width='100%'
                    px={3}
                    py={2}
                    bg='background.surface.raised.base'
                    borderRadius='md'
                    cursor='pointer'
                    _hover={menuButtonHoverProps}
                  >
                    <RawText fontSize='sm'>{categoryLabel}</RawText>
                  </MenuButton>
                  <MenuList zIndex={1002}>
                    <MenuOptionGroup type='radio' value={selectedCategory}>
                      {Object.values(MarketsCategories).map(category => (
                        <CategoryMenuItem
                          key={category}
                          category={category}
                          selectedCategory={selectedCategory}
                          onClick={handleCategoryChange(category)}
                          checkedIcon={checkedIcon}
                        />
                      ))}
                    </MenuOptionGroup>
                  </MenuList>
                </Menu>
              </Box>

              {sortOptions && (
                <Box>
                  <Text
                    translation='common.sortBy'
                    mb={2}
                    color='text.primary'
                    fontWeight='bold'
                    fontSize='sm'
                  />
                  <Menu>
                    <MenuButton
                      as={Box}
                      width='100%'
                      px={3}
                      py={2}
                      bg='background.surface.raised.base'
                      borderRadius='md'
                      cursor='pointer'
                      _hover={menuButtonHoverProps}
                    >
                      <RawText fontSize='sm'>
                        {translate(`dashboard.portfolio.${selectedSort}`)}
                      </RawText>
                    </MenuButton>
                    <MenuList zIndex={1002}>
                      <MenuOptionGroup type='radio' value={selectedSort}>
                        {sortOptions.map(sortOption => (
                          <MenuItemOption
                            key={sortOption}
                            value={sortOption}
                            onClick={handleSortOptionClick(sortOption)}
                            fontSize='sm'
                            iconPlacement='end'
                            icon={checkedIcon}
                            color={selectedSort === sortOption ? 'text.primary' : 'text.subtle'}
                          >
                            {translate(`dashboard.portfolio.${sortOption}`)}
                          </MenuItemOption>
                        ))}
                      </MenuOptionGroup>
                    </MenuList>
                  </Menu>
                </Box>
              )}

              <Box>
                <Text
                  translation='common.orderBy'
                  mb={2}
                  color='text.primary'
                  fontWeight='bold'
                  fontSize='sm'
                />
                <Menu>
                  <MenuButton
                    as={Box}
                    width='100%'
                    px={3}
                    py={2}
                    bg='background.surface.raised.base'
                    borderRadius='md'
                    cursor='pointer'
                    _hover={menuButtonHoverProps}
                  >
                    <RawText fontSize='sm'>{orderLabel}</RawText>
                  </MenuButton>
                  <MenuList zIndex={1002}>
                    <MenuOptionGroup type='radio' value={selectedOrder}>
                      <MenuItemOption
                        value={OrderDirection.Descending}
                        onClick={handleDescendingOrderChange}
                        fontSize='sm'
                        iconPlacement='end'
                        icon={checkedIcon}
                        color={
                          selectedOrder === OrderDirection.Descending
                            ? 'text.primary'
                            : 'text.subtle'
                        }
                      >
                        {translate('common.descending')}
                      </MenuItemOption>
                      <MenuItemOption
                        value={OrderDirection.Ascending}
                        onClick={handleAscendingOrderChange}
                        fontSize='sm'
                        iconPlacement='end'
                        icon={checkedIcon}
                        color={
                          selectedOrder === OrderDirection.Ascending
                            ? 'text.primary'
                            : 'text.subtle'
                        }
                      >
                        {translate('common.ascending')}
                      </MenuItemOption>
                    </MenuOptionGroup>
                  </MenuList>
                </Menu>
              </Box>
            </Flex>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Flex>
  )
}

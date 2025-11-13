import { CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  HStack,
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
  Text as ChakraText,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { TbAdjustmentsHorizontal, TbCategory, TbChevronDown } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { OrderDirection } from '@/components/OrderDropdown/types'
import type { SortOptionsKeys } from '@/components/SortDropdown/types'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { MarketsCategories } from '@/pages/Markets/constants'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch } from '@/state/store'

const settingsIcon = <TbAdjustmentsHorizontal />
const checkedIcon = <Icon as={CheckIcon} color='text.subtle' fontSize='16px' />
const chevronDownIcon = <Icon as={TbChevronDown} color='text.subtle' fontSize='16px' />

const popoverTriggerHoverStyles = {
  bg: 'transparent',
  color: 'text.base',
}

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
      icon={selectedCategory === category ? checkedIcon : undefined}
      color={selectedCategory === category ? 'text.base' : 'text.subtle'}
      fontWeight={selectedCategory === category ? 'medium' : 'normal'}
    >
      {label}
    </MenuItemOption>
  )
}

const SectionHeader = ({ icon, children }: { icon: React.ElementType; children: string }) => (
  <HStack spacing={2} mb={2}>
    <Icon as={icon} color='text.subtle' fontSize='16px' />
    <ChakraText
      fontSize='xs'
      fontWeight='semibold'
      textTransform='uppercase'
      letterSpacing='wider'
      color='text.subtle'
    >
      {children}
    </ChakraText>
  </HStack>
)

const StyledMenuButton = ({ children }: { children: React.ReactNode }) => (
  <MenuButton
    as={Button}
    rightIcon={chevronDownIcon}
    width='100%'
    borderRadius='md'
    borderWidth={1}
    borderColor='border.subtle'
    size='sm'
    fontWeight='normal'
    justifyContent='space-between'
    textAlign='left'
  >
    {children}
  </MenuButton>
)

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
  sortOptions,
  handleCategoryChange,
  handleSortOptionClick,
  handleOrderChange,
}: TopAssetsFiltersPopoverProps) => {
  const translate = useTranslate()
  const toast = useNotificationToast()
  const settings = useModal('settings')
  const appDispatch = useAppDispatch()

  const handleAscendingOrderChange = useCallback(() => {
    handleOrderChange(OrderDirection.Ascending)
  }, [handleOrderChange])

  const handleDescendingOrderChange = useCallback(() => {
    handleOrderChange(OrderDirection.Descending)
  }, [handleOrderChange])

  const handleHideCarousel = useCallback(() => {
    appDispatch(preferences.actions.setShowTopAssetsCarousel(false))
    toast({
      title: translate('trade.topAssetsCarousel.hiddenTitle'),
      description: translate('trade.topAssetsCarousel.hiddenDescription'),
      status: 'info',
      duration: 5000,
      onClick: () => {
        settings.open({})
      },
    })
  }, [appDispatch, toast, translate, settings])

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
      <Popover placement='bottom-end' closeOnBlur={true} returnFocusOnClose={false}>
        <PopoverTrigger>
          <IconButton
            aria-label={translate('common.settings')}
            icon={settingsIcon}
            size='md'
            fontSize='xl'
            variant='ghost'
            bg='transparent'
            isLoading={isLoading}
            borderRadius='lg'
            _hover={popoverTriggerHoverStyles}
          />
        </PopoverTrigger>
        <PopoverContent zIndex={1001} width='320px' borderRadius='xl' boxShadow='xl'>
          <PopoverBody p={5}>
            <VStack spacing={5} align='stretch'>
              <Box>
                <SectionHeader icon={TbCategory}>{translate('common.list')}</SectionHeader>
                <Menu>
                  <StyledMenuButton>
                    <RawText fontSize='sm' color='text.base'>
                      {categoryLabel}
                    </RawText>
                  </StyledMenuButton>
                  <MenuList zIndex={1002} borderRadius='lg' boxShadow='lg'>
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
                  <SectionHeader icon={TbAdjustmentsHorizontal}>
                    {translate('common.sortBy')}
                  </SectionHeader>
                  <Menu>
                    <StyledMenuButton>
                      <RawText fontSize='sm' color='text.base'>
                        {translate(`dashboard.portfolio.${selectedSort}`)}
                      </RawText>
                    </StyledMenuButton>
                    <MenuList zIndex={1002} borderRadius='lg' boxShadow='lg'>
                      <MenuOptionGroup type='radio' value={selectedSort}>
                        {sortOptions.map(sortOption => (
                          <MenuItemOption
                            key={sortOption}
                            value={sortOption}
                            onClick={handleSortOptionClick(sortOption)}
                            fontSize='sm'
                            iconPlacement='end'
                            icon={selectedSort === sortOption ? checkedIcon : undefined}
                            color={selectedSort === sortOption ? 'text.base' : 'text.subtle'}
                            fontWeight={selectedSort === sortOption ? 'medium' : 'normal'}
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
                <SectionHeader icon={TbAdjustmentsHorizontal}>
                  {translate('common.orderBy')}
                </SectionHeader>
                <ButtonGroup size='sm' isAttached variant='outline' width='100%'>
                  <Button
                    flex={1}
                    borderRadius='md'
                    borderColor='border.bold'
                    onClick={handleDescendingOrderChange}
                    isActive={selectedOrder === OrderDirection.Descending}
                  >
                    {translate('common.descending')}
                  </Button>
                  <Button
                    flex={1}
                    borderRadius='md'
                    borderColor='border.bold'
                    onClick={handleAscendingOrderChange}
                    borderLeftWidth={0}
                    isActive={selectedOrder === OrderDirection.Ascending}
                  >
                    {translate('common.ascending')}
                  </Button>
                </ButtonGroup>
              </Box>

              <Divider borderColor='border.subtle' />

              <Button
                onClick={handleHideCarousel}
                variant='ghost-filled'
                size='sm'
                colorScheme='red'
                justifyContent='center'
                fontWeight='normal'
              >
                {translate('trade.topAssetsCarousel.hide')}
              </Button>
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Flex>
  )
}

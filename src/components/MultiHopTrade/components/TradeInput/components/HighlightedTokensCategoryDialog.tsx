import { CheckIcon } from '@chakra-ui/icons'
import { Box, Icon, Menu, MenuItemOption, MenuOptionGroup } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '@/components/Modal/components/Dialog'
import { MarketsCategories } from '@/pages/Markets/constants'

type HighlightedTokensCategoryDialogProps = {
  isOpen: boolean
  onClose: () => void
  selectedCategory: MarketsCategories
  handleCategoryChange: (category: MarketsCategories) => void
}

const checkedIcon = <Icon as={CheckIcon} color='blue.200' fontSize='20px' />

const Category = ({
  category,
  selectedCategory,
  handleCategoryChange,
}: {
  category: MarketsCategories
  selectedCategory: MarketsCategories
  handleCategoryChange: (category: MarketsCategories) => void
}) => {
  const translate = useTranslate()
  const label = useMemo(() => {
    return category === MarketsCategories.OneClickDefi
      ? translate(`markets.categories.${category}.filterTitle`)
      : translate(`markets.categories.${category}.title`)
  }, [category, translate])

  return (
    <MenuItemOption
      key={category}
      value={category}
      // eslint-disable-next-line react-memo/require-usememo
      onClick={() => handleCategoryChange(category)}
      fontSize='md'
      iconPlacement='end'
      icon={checkedIcon}
      color={selectedCategory === category ? 'text.primary' : 'text.subtle'}
      fontWeight='bold'
    >
      {label}
    </MenuItemOption>
  )
}

export const HighlightedTokensCategoryDialog = ({
  isOpen,
  onClose,
  selectedCategory,
  handleCategoryChange,
}: HighlightedTokensCategoryDialogProps) => {
  return (
    <Dialog id='highlighted-tokens-category-dialog' isOpen={isOpen} onClose={onClose} height='auto'>
      <Box
        py={4}
        pb='calc(env(safe-area-inset-bottom) + var(--safe-area-inset-bottom) + var(--chakra-space-4))'
      >
        <Box height='5px' width='36px' borderRadius='full' bg='gray.500' mb={4} mx='auto' />
        <Menu>
          <MenuOptionGroup type='radio' value={selectedCategory}>
            {Object.values(MarketsCategories).map(category => {
              return (
                <Category
                  key={category}
                  category={category}
                  selectedCategory={selectedCategory}
                  handleCategoryChange={handleCategoryChange}
                />
              )
            })}
          </MenuOptionGroup>
        </Menu>
      </Box>
    </Dialog>
  )
}

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

export const HighlightedTokensCategoryDialog = ({
  isOpen,
  onClose,
  selectedCategory,
  handleCategoryChange,
}: HighlightedTokensCategoryDialogProps) => {
  const translate = useTranslate()

  const categories = useMemo(() => {
    const categoriesOptions = Object.values(MarketsCategories).map(category => ({
      label:
        category === MarketsCategories.OneClickDefi
          ? translate(`markets.categories.${category}.filterTitle`)
          : translate(`markets.categories.${category}.title`),
      value: category,
    }))

    return (
      <Menu>
        <MenuOptionGroup type='radio' value={selectedCategory}>
          {categoriesOptions.map(category => (
            <MenuItemOption
              key={category.value}
              value={category.value}
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => handleCategoryChange(category.value)}
              fontSize='md'
              iconPlacement='end'
              icon={checkedIcon}
              color={selectedCategory === category.value ? 'text.primary' : 'text.subtle'}
              fontWeight='bold'
            >
              {category.label}
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </Menu>
    )
  }, [handleCategoryChange, selectedCategory, translate])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto' isDisablingPropagation={false}>
      <Box
        py={4}
        pb='calc(env(safe-area-inset-bottom) + var(--safe-area-inset-bottom) + var(--chakra-space-4))'
      >
        <Box height='5px' width='36px' borderRadius='full' bg='gray.500' mb={4} mx='auto' />
        {categories}
      </Box>
    </Dialog>
  )
}

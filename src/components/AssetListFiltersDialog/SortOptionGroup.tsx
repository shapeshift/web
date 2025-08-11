import { CheckIcon } from '@chakra-ui/icons'
import { Box, Icon, MenuItemOption, MenuOptionGroup } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { SortOptionsKeys } from '@/components/SortDropdown/types'
import { Text } from '@/components/Text'
import type { MarketsCategories } from '@/pages/Markets/constants'
import { sortOptionsByCategory } from '@/pages/Markets/constants'

const checkedIcon = <Icon as={CheckIcon} color='blue.200' fontSize='20px' />

type SortOptionGroupProps = {
  selectedCategory: MarketsCategories
  selectedSort: SortOptionsKeys
  handleSortChange: (sort: SortOptionsKeys) => void
}

export const SortOptionGroup = ({
  selectedCategory,
  selectedSort,
  handleSortChange,
}: SortOptionGroupProps) => {
  const translate = useTranslate()
  const sortOptions = useMemo(() => {
    return sortOptionsByCategory[selectedCategory]
  }, [selectedCategory])

  const filtersOptions = useMemo(
    () =>
      sortOptions?.map(filter => ({
        label: translate(`dashboard.portfolio.${filter}`),
        value: filter,
      })),
    [translate, sortOptions],
  )

  if (!sortOptions || !filtersOptions) return null

  return (
    <>
      <Text translation='common.sortBy' mb={2} color='text.primary' fontWeight='bold' />
      <Box backgroundColor='background.surface.raised.base' borderRadius='10' p={2} mb={4}>
        <MenuOptionGroup type='radio' value={selectedSort}>
          {filtersOptions.map(sortOption => (
            <MenuItemOption
              key={sortOption.value}
              value={sortOption.value}
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => handleSortChange(sortOption.value)}
              fontSize='md'
              iconPlacement='end'
              icon={checkedIcon}
              fontWeight='bold'
              color={selectedSort === sortOption.value ? 'text.primary' : 'text.subtle'}
            >
              {sortOption.label}
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </Box>
    </>
  )
}

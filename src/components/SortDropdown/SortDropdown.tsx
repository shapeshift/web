import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ButtonProps, MenuProps } from '@chakra-ui/react'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Text,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { SortOption } from './types'
import { SortOptionsKeys } from './types'

type SortDropdownProps = {
  value: SortOptionsKeys
  onClick: (arg: SortOptionsKeys) => void
  buttonProps?: ButtonProps
} & Omit<MenuProps, 'children'>

const sortOptions: SortOption[] = [
  {
    key: SortOptionsKeys.VOLUME,
    label: 'dashboard.portfolio.volume',
  },
  {
    key: SortOptionsKeys.PRICE_CHANGE,
    label: 'dashboard.portfolio.priceChange',
  },
  {
    key: SortOptionsKeys.MARKET_CAP,
    label: 'dashboard.portfolio.marketCap',
  },
]

const width = { base: 'full', md: 'auto' }

const chevronDownIcon = <ChevronDownIcon />

export const SortDropdown: React.FC<SortDropdownProps> = ({
  onClick,
  value,
  buttonProps,
  ...menuProps
}) => {
  const translate = useTranslate()

  const renderOptions = useMemo(() => {
    return sortOptions.map(option => (
      <MenuItemOption value={option.key} key={option.key}>
        {translate(option.label)}
      </MenuItemOption>
    ))
  }, [translate])

  const onChange = useCallback(
    (value: string | string[]) => onClick(value as SortOptionsKeys),
    [onClick],
  )

  const selectedLabel = useMemo(() => {
    const selectedOption = sortOptions.find(option => option.key === value)
    return selectedOption ? translate(selectedOption.label) : ''
  }, [translate, value])

  return (
    <Flex alignItems='center' mx={2}>
      <Text me={4}>{translate('common.sortBy')}</Text>
      <Menu {...menuProps}>
        <MenuButton width={width} as={Button} rightIcon={chevronDownIcon} {...buttonProps}>
          {selectedLabel}
        </MenuButton>
        <MenuList zIndex='banner'>
          <MenuOptionGroup type='radio' value={value} onChange={onChange}>
            {renderOptions}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
    </Flex>
  )
}

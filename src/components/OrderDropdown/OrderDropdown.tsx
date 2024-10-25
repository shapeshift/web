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

import { type OrderOption, OrderOptionsKeys } from './types'

type OrderDropdownProps = {
  value: OrderOptionsKeys
  onClick: (arg: OrderOptionsKeys) => void
  buttonProps?: ButtonProps
} & Omit<MenuProps, 'children'>

const orderOptions: OrderOption[] = [
  {
    key: OrderOptionsKeys.ASCENDING,
    label: 'common.ascending',
  },
  {
    key: OrderOptionsKeys.DESCENDING,
    label: 'common.descending',
  },
]

const width = { base: 'full', md: 'auto' }

const chevronDownIcon = <ChevronDownIcon />

export const OrderDropdown: React.FC<OrderDropdownProps> = ({
  onClick,
  value,
  buttonProps,
  ...menuProps
}) => {
  const translate = useTranslate()

  const renderOptions = useMemo(() => {
    return orderOptions.map(option => (
      <MenuItemOption value={option.key} key={option.key}>
        {translate(option.label)}
      </MenuItemOption>
    ))
  }, [translate])

  const onChange = useCallback(
    (value: string | string[]) => onClick(value as OrderOptionsKeys),
    [onClick],
  )

  const selectedLabel = useMemo(() => {
    const selectedOption = orderOptions.find(option => option.key === value)
    return selectedOption ? translate(selectedOption.label) : ''
  }, [translate, value])

  return (
    <Flex alignItems='center' mx={2}>
      <Text me={4}>{translate('common.orderBy')}</Text>
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

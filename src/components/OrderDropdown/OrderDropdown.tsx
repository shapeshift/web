import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
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

import { OrderDirection } from './types'

type OrderDropdownProps = {
  value: OrderDirection
  onClick: (arg: OrderDirection) => void
  buttonProps?: ButtonProps
}

const width = { base: 'full', md: 'auto' }

const chevronDownIcon = <ChevronDownIcon />

export const OrderDropdown: React.FC<OrderDropdownProps> = ({ onClick, value, buttonProps }) => {
  const translate = useTranslate()

  const renderOptions = useMemo(() => {
    return Object.values(OrderDirection).map(option => (
      <MenuItemOption value={option} key={option}>
        {translate(`common.${option}`)}
      </MenuItemOption>
    ))
  }, [translate])

  const onChange = useCallback(
    (value: string | string[]) => onClick(value as OrderDirection),
    [onClick],
  )

  const selectedLabel = useMemo(() => {
    const selectedOption = Object.values(OrderDirection).find(option => option === value)
    return selectedOption ? translate(`common.${selectedOption}`) : ''
  }, [translate, value])

  return (
    <Flex alignItems='center' mx={2}>
      <Text me={4}>{translate('common.orderBy')}</Text>
      <Menu>
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

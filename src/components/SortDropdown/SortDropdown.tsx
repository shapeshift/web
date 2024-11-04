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

import type { SortOptionsKeys } from './types'

type SortDropdownProps = {
  value: SortOptionsKeys
  onClick: (arg: SortOptionsKeys) => void
  buttonProps?: ButtonProps
  options: SortOptionsKeys[]
}

const width = { base: 'full', md: 'auto' }

const chevronDownIcon = <ChevronDownIcon />

export const SortDropdown: React.FC<SortDropdownProps> = ({
  onClick,
  value,
  buttonProps,
  options,
}) => {
  const translate = useTranslate()

  const renderOptions = useMemo(() => {
    return options.map(option => (
      <MenuItemOption value={option} key={option}>
        {translate(`dashboard.portfolio.${option}`)}
      </MenuItemOption>
    ))
  }, [translate, options])

  const onChange = useCallback(
    (value: string | string[]) => onClick(value as SortOptionsKeys),
    [onClick],
  )

  const selectedLabel = useMemo(() => {
    const selectedOption = options.find(option => option === value)
    return selectedOption ? translate(`dashboard.portfolio.${selectedOption}`) : ''
  }, [translate, value, options])

  return (
    <Flex alignItems='center' mx={2}>
      <Text me={4}>{translate('common.sortBy')}</Text>
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

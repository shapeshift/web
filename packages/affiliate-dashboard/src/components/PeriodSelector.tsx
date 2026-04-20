import { ChevronDownIcon } from '@chakra-ui/icons'
import { Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react'

import type { Period } from '../lib/periods'

interface PeriodSelectorProps {
  periods: Period[]
  selectedKey: string
  onSelect: (key: string) => void
}

export const PeriodSelector = ({
  periods,
  selectedKey,
  onSelect,
}: PeriodSelectorProps): React.JSX.Element => {
  const selected = periods.find(p => p.key === selectedKey) ?? periods[0]

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ChevronDownIcon />}
        size='sm'
        variant='outline'
        px={4}
        py={2}
        fontSize='xs'
        fontWeight={500}
        bg='bg.surface'
        borderColor='border.subtle'
        color='fg.default'
        flexShrink={0}
        _hover={{ bg: 'bg.raised', borderColor: 'border.input' }}
      >
        {selected.label}
      </MenuButton>
      <MenuList
        bg='bg.surface'
        borderColor='border.subtle'
        boxShadow='xl'
        minW='200px'
        maxH='320px'
        overflowY='auto'
      >
        {periods.map(period => {
          const isActive = period.key === selectedKey
          return (
            <MenuItem
              key={period.key}
              onClick={() => onSelect(period.key)}
              bg={isActive ? 'rgba(55, 97, 249, 0.1)' : 'transparent'}
              color={isActive ? 'brand.500' : 'fg.default'}
              fontSize='sm'
              _hover={{ bg: 'bg.raised' }}
              _focus={{ bg: 'bg.raised' }}
            >
              {period.label}
            </MenuItem>
          )
        })}
      </MenuList>
    </Menu>
  )
}

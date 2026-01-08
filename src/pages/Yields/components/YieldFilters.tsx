import { ChevronDownIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import {
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import React from 'react'
import { FaSortAlphaDown, FaSortAlphaUp, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa'

import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'

export type SortOption = 'apy-desc' | 'apy-asc' | 'tvl-desc' | 'tvl-asc' | 'name-asc' | 'name-desc'

export type NetworkOption = {
  id: string // chainId or slug
  name: string
  icon?: string // url
  chainId?: ChainId // if available for ChainIcon
}

export type ProviderOption = {
  id: string
  name: string
  icon?: string
}

type YieldFiltersProps = {
  networks: NetworkOption[]
  selectedNetwork: string | null // null = all
  onSelectNetwork: (id: string | null) => void

  providers: ProviderOption[]
  selectedProvider: string | null
  onSelectProvider: (id: string | null) => void

  sortOption: SortOption
  onSortChange: (option: SortOption) => void
} & StackProps

const FilterMenu = ({
  label,
  value,
  options,
  onSelect,
  renderIcon,
}: {
  label: string
  value: string | null
  options: { id: string; name: string; icon?: string; chainId?: ChainId }[]
  onSelect: (id: string | null) => void
  renderIcon?: (opt: any) => React.ReactElement
}) => {
  const selectedOption = options.find(o => o.id === value)
  const displayLabel = selectedOption ? selectedOption.name : label
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ChevronDownIcon />}
        bg={bg}
        borderWidth='1px'
        borderColor={borderColor}
        variant='outline'
        size='md'
        textAlign='left'
        minW='160px'
        _hover={{ bg: useColorModeValue('gray.50', 'gray.750') }}
        _active={{ bg: useColorModeValue('gray.100', 'gray.700') }}
      >
        <HStack spacing={2}>
          {selectedOption && renderIcon && renderIcon(selectedOption)}
          <Text isTruncated maxW='120px'>
            {displayLabel}
          </Text>
        </HStack>
      </MenuButton>
      <MenuList zIndex={10}>
        <MenuItem onClick={() => onSelect(null)}>{label}</MenuItem>
        {options.map(opt => (
          <MenuItem key={opt.id} onClick={() => onSelect(opt.id)}>
            <HStack spacing={3}>
              {renderIcon && renderIcon(opt)}
              <Text>{opt.name}</Text>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}

export const YieldFilters = ({
  networks,
  selectedNetwork,
  onSelectNetwork,
  providers,
  selectedProvider,
  onSelectProvider,
  sortOption,
  onSortChange,
  ...props
}: YieldFiltersProps) => {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'apy-desc', label: 'Highest APY' },
    { value: 'apy-asc', label: 'Lowest APY' },
    { value: 'tvl-desc', label: 'Highest TVL' },
    { value: 'tvl-asc', label: 'Lowest TVL' },
    { value: 'name-asc', label: 'Name (A-Z)' },
  ]

  return (
    <Stack direction={{ base: 'column', md: 'row' }} spacing={4} {...props}>
      <FilterMenu
        label='All Networks'
        value={selectedNetwork}
        options={networks}
        onSelect={onSelectNetwork}
        renderIcon={opt =>
          opt.chainId ? (
            <ChainIcon chainId={opt.chainId} size='xs' />
          ) : (
            <AssetIcon
              src={opt.icon} // Or direct src
              size='xs'
            />
          )
        }
      />

      <FilterMenu
        label='All Providers'
        value={selectedProvider}
        options={providers}
        onSelect={onSelectProvider}
        renderIcon={opt => <AssetIcon src={opt.icon} size='xs' />}
      />

      <Menu>
        <Tooltip label='Sort' hasArrow>
          <MenuButton
            as={IconButton}
            aria-label='Sort'
            icon={
              sortOption === 'name-asc' || sortOption === 'name-desc' ? (
                sortOption === 'name-asc' ? (
                  <FaSortAlphaDown />
                ) : (
                  <FaSortAlphaUp />
                )
              ) : sortOption.includes('asc') ? (
                <FaSortAmountUp />
              ) : (
                <FaSortAmountDown />
              )
            }
            bg={useColorModeValue('white', 'gray.800')}
            borderWidth='1px'
            borderColor={useColorModeValue('gray.200', 'gray.700')}
            variant='outline'
            size='md'
            _hover={{ bg: useColorModeValue('gray.50', 'gray.750') }}
            _active={{ bg: useColorModeValue('gray.100', 'gray.700') }}
          />
        </Tooltip>
        <MenuList zIndex={10}>
          {sortOptions.map(opt => (
            <MenuItem
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              color={sortOption === opt.value ? 'blue.500' : 'inherit'}
              fontWeight={sortOption === opt.value ? 'bold' : 'normal'}
            >
              {opt.label}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Stack>
  )
}

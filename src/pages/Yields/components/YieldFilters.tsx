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
import { useTranslate } from 'react-polyglot'

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
  const selectedBg = useColorModeValue('blue.50', 'blue.900')
  const selectedColor = useColorModeValue('blue.600', 'blue.200')

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
      <MenuList zIndex={10} maxH='300px' overflowY='auto'>
        <MenuItem
          onClick={() => onSelect(null)}
          bg={value === null ? selectedBg : undefined}
          color={value === null ? selectedColor : undefined}
          fontWeight={value === null ? 'semibold' : undefined}
        >
          {label}
        </MenuItem>
        {options.map(opt => (
          <MenuItem
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            bg={value === opt.id ? selectedBg : undefined}
            color={value === opt.id ? selectedColor : undefined}
            fontWeight={value === opt.id ? 'semibold' : undefined}
          >
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
  const translate = useTranslate()
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'apy-desc', label: translate('yieldXYZ.highestApy') },
    { value: 'apy-asc', label: translate('yieldXYZ.lowestApy') },
    { value: 'tvl-desc', label: translate('yieldXYZ.highestTvl') },
    { value: 'tvl-asc', label: translate('yieldXYZ.lowestTvl') },
    { value: 'name-asc', label: translate('yieldXYZ.nameAZ') },
  ]

  return (
    <Stack direction={{ base: 'column', md: 'row' }} spacing={4} {...props}>
      <FilterMenu
        label={translate('yieldXYZ.allNetworks')}
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
        label={translate('yieldXYZ.allProviders')}
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
        <MenuList zIndex={10} maxH='300px' overflowY='auto'>
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

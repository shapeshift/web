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
import React, { memo, useCallback, useMemo } from 'react'
import { FaSortAlphaDown, FaSortAlphaUp, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'

export type SortOption = 'apy-desc' | 'apy-asc' | 'tvl-desc' | 'tvl-asc' | 'name-asc' | 'name-desc'

export type NetworkOption = {
  id: string
  name: string
  icon?: string
  chainId?: ChainId
}

export type ProviderOption = {
  id: string
  name: string
  icon?: string
}

type FilterMenuProps = {
  label: string
  value: string | null
  options: { id: string; name: string; icon?: string; chainId?: ChainId }[]
  onSelect: (id: string | null) => void
  renderIcon?: (opt: {
    id: string
    name: string
    icon?: string
    chainId?: ChainId
  }) => React.ReactElement
}

const chevronDownIcon = <ChevronDownIcon />

const FilterMenu = memo(({ label, value, options, onSelect, renderIcon }: FilterMenuProps) => {
  const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value])
  const displayLabel = useMemo(
    () => (selectedOption ? selectedOption.name : label),
    [selectedOption, label],
  )
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const selectedBg = useColorModeValue('blue.50', 'blue.900')
  const selectedColor = useColorModeValue('blue.600', 'blue.200')
  const hoverBg = useColorModeValue('gray.50', 'gray.750')
  const activeBg = useColorModeValue('gray.100', 'gray.700')

  const handleSelectAll = useCallback(() => onSelect(null), [onSelect])

  const hoverStyle = useMemo(() => ({ bg: hoverBg }), [hoverBg])
  const activeStyle = useMemo(() => ({ bg: activeBg }), [activeBg])

  const selectedIcon = useMemo(
    () => (selectedOption && renderIcon ? renderIcon(selectedOption) : null),
    [selectedOption, renderIcon],
  )

  const allItemBg = useMemo(() => (value === null ? selectedBg : undefined), [value, selectedBg])
  const allItemColor = useMemo(
    () => (value === null ? selectedColor : undefined),
    [value, selectedColor],
  )
  const allItemFontWeight = useMemo(() => (value === null ? 'semibold' : undefined), [value])

  const menuItems = useMemo(
    () =>
      options.map(opt => {
        const isSelected = value === opt.id
        return (
          <MenuItem
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            bg={isSelected ? selectedBg : undefined}
            color={isSelected ? selectedColor : undefined}
            fontWeight={isSelected ? 'semibold' : undefined}
          >
            <HStack spacing={3}>
              {renderIcon && renderIcon(opt)}
              <Text>{opt.name}</Text>
            </HStack>
          </MenuItem>
        )
      }),
    [options, value, selectedBg, selectedColor, renderIcon, onSelect],
  )

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={chevronDownIcon}
        bg={bg}
        borderWidth='1px'
        borderColor={borderColor}
        variant='outline'
        size='md'
        textAlign='left'
        minW='160px'
        _hover={hoverStyle}
        _active={activeStyle}
      >
        <HStack spacing={2}>
          {selectedIcon}
          <Text isTruncated maxW='120px'>
            {displayLabel}
          </Text>
        </HStack>
      </MenuButton>
      <MenuList zIndex={10} maxH='300px' overflowY='auto'>
        <MenuItem
          onClick={handleSelectAll}
          bg={allItemBg}
          color={allItemColor}
          fontWeight={allItemFontWeight}
        >
          {label}
        </MenuItem>
        {menuItems}
      </MenuList>
    </Menu>
  )
})

type YieldFiltersProps = {
  networks: NetworkOption[]
  selectedNetwork: string | null
  onSelectNetwork: (id: string | null) => void
  providers: ProviderOption[]
  selectedProvider: string | null
  onSelectProvider: (id: string | null) => void
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
} & StackProps

export const YieldFilters = memo(
  ({
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
    const bg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const hoverBg = useColorModeValue('gray.50', 'gray.750')
    const activeBg = useColorModeValue('gray.100', 'gray.700')

    const sortOptions = useMemo(
      () => [
        { value: 'apy-desc' as const, label: translate('yieldXYZ.highestApy') },
        { value: 'apy-asc' as const, label: translate('yieldXYZ.lowestApy') },
        { value: 'tvl-desc' as const, label: translate('yieldXYZ.highestTvl') },
        { value: 'tvl-asc' as const, label: translate('yieldXYZ.lowestTvl') },
        { value: 'name-asc' as const, label: translate('yieldXYZ.nameAZ') },
      ],
      [translate],
    )

    const allNetworksLabel = useMemo(() => translate('yieldXYZ.allNetworks'), [translate])
    const allProvidersLabel = useMemo(() => translate('yieldXYZ.allProviders'), [translate])

    const renderNetworkIcon = useCallback(
      (opt: { id: string; name: string; icon?: string; chainId?: ChainId }) => {
        if (opt.chainId) return <ChainIcon chainId={opt.chainId} size='xs' />
        return <AssetIcon src={opt.icon} size='xs' />
      },
      [],
    )

    const renderProviderIcon = useCallback(
      (opt: { id: string; name: string; icon?: string }) => <AssetIcon src={opt.icon} size='xs' />,
      [],
    )

    const sortIcon = useMemo(() => {
      if (sortOption === 'name-asc') return <FaSortAlphaDown />
      if (sortOption === 'name-desc') return <FaSortAlphaUp />
      if (sortOption.includes('asc')) return <FaSortAmountUp />
      return <FaSortAmountDown />
    }, [sortOption])

    const hoverStyle = useMemo(() => ({ bg: hoverBg }), [hoverBg])
    const activeStyle = useMemo(() => ({ bg: activeBg }), [activeBg])

    const sortMenuItems = useMemo(
      () =>
        sortOptions.map(opt => (
          <MenuItem
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            color={sortOption === opt.value ? 'blue.500' : 'inherit'}
            fontWeight={sortOption === opt.value ? 'bold' : 'normal'}
          >
            {opt.label}
          </MenuItem>
        )),
      [sortOptions, sortOption, onSortChange],
    )

    return (
      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} {...props}>
        <FilterMenu
          label={allNetworksLabel}
          value={selectedNetwork}
          options={networks}
          onSelect={onSelectNetwork}
          renderIcon={renderNetworkIcon}
        />
        <FilterMenu
          label={allProvidersLabel}
          value={selectedProvider}
          options={providers}
          onSelect={onSelectProvider}
          renderIcon={renderProviderIcon}
        />
        <Menu>
          <Tooltip label='Sort' hasArrow>
            <MenuButton
              as={IconButton}
              aria-label='Sort'
              icon={sortIcon}
              bg={bg}
              borderWidth='1px'
              borderColor={borderColor}
              variant='outline'
              size='md'
              _hover={hoverStyle}
              _active={activeStyle}
            />
          </Tooltip>
          <MenuList zIndex={10} maxH='300px' overflowY='auto'>
            {sortMenuItems}
          </MenuList>
        </Menu>
      </Stack>
    )
  },
)

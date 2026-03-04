import { ChevronDownIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import {
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import React, { memo, useCallback, useMemo } from 'react'
import { FaSortAlphaDown, FaSortAlphaUp, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'

export type SortOption =
  | 'yearly-return-desc'
  | 'apy-desc'
  | 'apy-asc'
  | 'tvl-desc'
  | 'tvl-asc'
  | 'name-asc'
  | 'name-desc'

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

export type TypeOption = {
  id: string
  name: string
}

type FilterMenuProps = {
  label: string
  testId: string
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

const ALL_OPTION_VALUE = '__all__'

const FilterMenu = memo(
  ({ label, testId, value, options, onSelect, renderIcon }: FilterMenuProps) => {
    const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value])
    const displayLabel = useMemo(
      () => (selectedOption ? selectedOption.name : label),
      [selectedOption, label],
    )

    const selectedIcon = useMemo(
      () => (selectedOption && renderIcon ? renderIcon(selectedOption) : null),
      [selectedOption, renderIcon],
    )

    const handleChange = useCallback(
      (newValue: string | string[]) => {
        const selectedValue = Array.isArray(newValue) ? newValue[0] : newValue
        onSelect(selectedValue === ALL_OPTION_VALUE ? null : selectedValue)
      },
      [onSelect],
    )

    const menuItems = useMemo(
      () =>
        options.map(opt => (
          <MenuItemOption key={opt.id} value={opt.id}>
            <HStack spacing={3}>
              {renderIcon && renderIcon(opt)}
              <Text>{opt.name}</Text>
            </HStack>
          </MenuItemOption>
        )),
      [options, renderIcon],
    )

    return (
      <Menu>
        <MenuButton as={Button} rightIcon={chevronDownIcon} minW='160px' data-testid={testId}>
          <HStack spacing={2}>
            {selectedIcon}
            <Text isTruncated maxW='120px'>
              {displayLabel}
            </Text>
          </HStack>
        </MenuButton>
        <MenuList zIndex='banner' maxH='300px' overflowY='auto'>
          <MenuOptionGroup type='radio' value={value ?? ALL_OPTION_VALUE} onChange={handleChange}>
            <MenuItemOption value={ALL_OPTION_VALUE}>{label}</MenuItemOption>
            {menuItems}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
    )
  },
)

type YieldFiltersProps = {
  networks: NetworkOption[]
  selectedNetwork: string | null
  onSelectNetwork: (id: string | null) => void
  providers: ProviderOption[]
  selectedProvider: string | null
  onSelectProvider: (id: string | null) => void
  types: TypeOption[]
  selectedType: string | null
  onSelectType: (id: string | null) => void
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
    types,
    selectedType,
    onSelectType,
    sortOption,
    onSortChange,
    ...props
  }: YieldFiltersProps) => {
    const translate = useTranslate()

    const sortOptions = useMemo(
      () => [
        {
          value: 'yearly-return-desc' as const,
          label: translate('yieldXYZ.bestReturn'),
        },
        { value: 'apy-desc' as const, label: translate('yieldXYZ.highestApy') },
        { value: 'apy-asc' as const, label: translate('yieldXYZ.lowestApy') },
        { value: 'tvl-desc' as const, label: translate('yieldXYZ.highestTvl') },
        { value: 'tvl-asc' as const, label: translate('yieldXYZ.lowestTvl') },
        { value: 'name-asc' as const, label: translate('yieldXYZ.nameAZ') },
        { value: 'name-desc' as const, label: translate('yieldXYZ.nameZA') },
      ],
      [translate],
    )

    const allNetworksLabel = useMemo(() => translate('yieldXYZ.allNetworks'), [translate])
    const allProvidersLabel = useMemo(() => translate('yieldXYZ.allProviders'), [translate])
    const allTypesLabel = useMemo(() => translate('yieldXYZ.allTypes'), [translate])

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

    const handleSortChange = useCallback(
      (newValue: string | string[]) => {
        const selectedValue = Array.isArray(newValue) ? newValue[0] : newValue
        onSortChange(selectedValue as SortOption)
      },
      [onSortChange],
    )

    const sortMenuItems = useMemo(
      () =>
        sortOptions.map(opt => (
          <MenuItemOption key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItemOption>
        )),
      [sortOptions],
    )

    return (
      <Stack
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        width={{ base: 'full', md: 'auto' }}
        {...props}
      >
        <FilterMenu
          label={allNetworksLabel}
          testId='yield-filter-network'
          value={selectedNetwork}
          options={networks}
          onSelect={onSelectNetwork}
          renderIcon={renderNetworkIcon}
        />
        <FilterMenu
          label={allProvidersLabel}
          testId='yield-filter-provider'
          value={selectedProvider}
          options={providers}
          onSelect={onSelectProvider}
          renderIcon={renderProviderIcon}
        />
        <FilterMenu
          label={allTypesLabel}
          testId='yield-filter-type'
          value={selectedType}
          options={types}
          onSelect={onSelectType}
        />
        <Menu>
          <Tooltip label='Sort' hasArrow>
            <MenuButton
              as={IconButton}
              aria-label='Sort'
              icon={sortIcon}
              width={{ base: 'full', md: 'auto' }}
              data-testid='yield-filter-sort'
            />
          </Tooltip>
          <MenuList zIndex='banner' maxH='300px' overflowY='auto'>
            <MenuOptionGroup type='radio' value={sortOption} onChange={handleSortChange}>
              {sortMenuItems}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
      </Stack>
    )
  },
)

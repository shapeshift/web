import {
    Button,
    HStack,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Stack,
    Text,
    useColorModeValue,
} from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { ChainIcon } from '@/components/ChainMenu'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainId } from '@shapeshiftoss/caip'

export type SortOption = 'apy-desc' | 'apy-asc' | 'tvl-desc' | 'tvl-asc' | 'name-asc'

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
}

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
    renderIcon?: (opt: any) => JSX.Element
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
                size='sm'
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
}: YieldFiltersProps) => {

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'apy-desc', label: 'Highest APY' },
        { value: 'apy-asc', label: 'Lowest APY' },
        { value: 'tvl-desc', label: 'Highest TVL' },
        { value: 'tvl-asc', label: 'Lowest TVL' },
        { value: 'name-asc', label: 'Name (A-Z)' },
    ]
    const currentSortLabel = sortOptions.find(o => o.value === sortOption)?.label ?? 'Sort'

    return (
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4} mb={6}>
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
                renderIcon={opt => (
                    <AssetIcon src={opt.icon} size='xs' />
                )}
            />

            <Menu>
                <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    bg={useColorModeValue('white', 'gray.800')}
                    borderWidth='1px'
                    borderColor={useColorModeValue('gray.200', 'gray.700')}
                    variant='outline'
                    size='sm'
                    minW='160px'
                    textAlign='left'
                >
                    {currentSortLabel}
                </MenuButton>
                <MenuList zIndex={10}>
                    {sortOptions.map(opt => (
                        <MenuItem key={opt.value} onClick={() => onSortChange(opt.value)}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </MenuList>
            </Menu>
        </Stack>
    )
}

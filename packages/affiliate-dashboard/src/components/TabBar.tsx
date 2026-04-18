import { Button, HStack } from '@chakra-ui/react'

export type TabKey = 'overview' | 'swaps' | 'settings'

interface TabBarProps {
  active: TabKey
  onChange: (tab: TabKey) => void
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'swaps', label: 'Swap History' },
  { key: 'settings', label: 'Settings' },
]

export const TabBar = ({ active, onChange }: TabBarProps): React.JSX.Element => (
  <HStack
    spacing={1}
    mb={6}
    borderBottom='1px solid'
    borderColor='border.subtle'
    role='tablist'
    overflowX='auto'
    overflowY='hidden'
    sx={{
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    }}
  >
    {tabs.map(tab => {
      const isActive = active === tab.key
      return (
        <Button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          role='tab'
          aria-selected={isActive}
          variant='ghost'
          size='md'
          px={{ base: 4, md: 5 }}
          py={3}
          fontSize='sm'
          fontWeight={500}
          color={isActive ? 'fg.bright' : 'fg.muted'}
          borderRadius={0}
          borderBottom='2px solid'
          borderBottomColor={isActive ? 'brand.500' : 'transparent'}
          mb='-1px'
          _hover={{ bg: 'transparent', color: 'fg.bright' }}
          _active={{ bg: 'transparent' }}
        >
          {tab.label}
        </Button>
      )
    })}
  </HStack>
)

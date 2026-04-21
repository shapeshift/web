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
    role='tablist'
    flex={1}
    minW={0}
    overflowX='auto'
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
          py={5}
          fontSize='sm'
          fontWeight={500}
          color={isActive ? 'fg.bright' : 'fg.muted'}
          borderRadius={0}
          boxShadow={isActive ? 'inset 0 -2px 0 0 var(--chakra-colors-brand-500)' : 'none'}
          _hover={{ bg: 'transparent', color: 'fg.bright' }}
          _active={{ bg: 'transparent' }}
        >
          {tab.label}
        </Button>
      )
    })}
  </HStack>
)

import { Button, Wrap, WrapItem } from '@chakra-ui/react'

import type { Period } from '../lib/periods'

interface PeriodSelectorProps {
  periods: Period[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export const PeriodSelector = ({
  periods,
  selectedIndex,
  onSelect,
}: PeriodSelectorProps): React.JSX.Element => (
  <Wrap spacing={2} mb={6}>
    {periods.map((period, i) => {
      const isActive = selectedIndex === i
      return (
        <WrapItem key={period.label}>
          <Button
            size='sm'
            variant='outline'
            onClick={() => onSelect(i)}
            px={4}
            py={2}
            fontSize='xs'
            fontWeight={500}
            bg={isActive ? 'rgba(55, 97, 249, 0.12)' : 'bg.surface'}
            borderColor={isActive ? 'brand.500' : 'border.subtle'}
            color={isActive ? 'brand.500' : 'fg.muted'}
            _hover={{
              bg: isActive ? 'rgba(55, 97, 249, 0.18)' : 'bg.raised',
              borderColor: isActive ? 'brand.500' : 'border.input',
            }}
          >
            {period.label}
          </Button>
        </WrapItem>
      )
    })}
  </Wrap>
)

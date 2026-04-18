import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'

import {
  ALL_TIME_INDEX,
  olderByYear,
  RECENT_MONTHS_COUNT,
  recentPeriods,
  type Period,
} from '../lib/periods'

interface PeriodSelectorProps {
  periods: Period[]
  selectedIndex: number
  onSelect: (index: number) => void
}

const pillStyle = (
  isActive: boolean,
): {
  size: 'sm'
  variant: 'outline'
  px: number
  py: number
  fontSize: string
  fontWeight: number
  bg: string
  borderColor: string
  color: string
  _hover: { bg: string; borderColor: string }
} => ({
  size: 'sm',
  variant: 'outline',
  px: 4,
  py: 2,
  fontSize: 'xs',
  fontWeight: 500,
  bg: isActive ? 'rgba(55, 97, 249, 0.12)' : 'bg.surface',
  borderColor: isActive ? 'brand.500' : 'border.subtle',
  color: isActive ? 'brand.500' : 'fg.muted',
  _hover: {
    bg: isActive ? 'rgba(55, 97, 249, 0.18)' : 'bg.raised',
    borderColor: isActive ? 'brand.500' : 'border.input',
  },
})

export const PeriodSelector = ({
  periods,
  selectedIndex,
  onSelect,
}: PeriodSelectorProps): React.JSX.Element => {
  const selectedIsOlder =
    selectedIndex >= RECENT_MONTHS_COUNT && selectedIndex < ALL_TIME_INDEX
  const olderLabel = selectedIsOlder ? periods[selectedIndex].label : 'Older'

  return (
    <Wrap spacing={2} mb={6} align='center'>
      {recentPeriods.map((period, i) => {
        const isActive = selectedIndex === i
        return (
          <WrapItem key={period.label}>
            <Button onClick={() => onSelect(i)} {...pillStyle(isActive)}>
              {period.label}
            </Button>
          </WrapItem>
        )
      })}

      {olderByYear.length > 0 && (
        <WrapItem>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              {...pillStyle(selectedIsOlder)}
            >
              {olderLabel}
            </MenuButton>
            <MenuList
              bg='bg.surface'
              borderColor='border.subtle'
              boxShadow='xl'
              minW='220px'
              maxH='320px'
              overflowY='auto'
            >
              {olderByYear.map((group, groupIdx) => (
                <MenuGroup
                  key={group.year}
                  title={group.year}
                  color='fg.muted'
                  fontSize='xs'
                  textTransform='uppercase'
                  letterSpacing='0.06em'
                >
                  {group.items.map(({ period, index }) => (
                    <MenuItem
                      key={period.label}
                      onClick={() => onSelect(index)}
                      bg={selectedIndex === index ? 'rgba(55, 97, 249, 0.1)' : 'transparent'}
                      color={selectedIndex === index ? 'brand.500' : 'fg.default'}
                      fontSize='sm'
                      _hover={{ bg: 'bg.raised' }}
                      _focus={{ bg: 'bg.raised' }}
                    >
                      {period.monthLabel}
                    </MenuItem>
                  ))}
                  {groupIdx < olderByYear.length - 1 && <MenuDivider borderColor='border.muted' />}
                </MenuGroup>
              ))}
            </MenuList>
          </Menu>
        </WrapItem>
      )}

      <WrapItem>
        <Button
          onClick={() => onSelect(ALL_TIME_INDEX)}
          {...pillStyle(selectedIndex === ALL_TIME_INDEX)}
        >
          All Time
        </Button>
      </WrapItem>
    </Wrap>
  )
}

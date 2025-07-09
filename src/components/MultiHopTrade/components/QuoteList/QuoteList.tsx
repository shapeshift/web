import { ChevronDownIcon } from '@chakra-ui/icons'
import type { CardProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { QuoteTimer } from '../TradeInput/components/QuoteTimer'
import { TradeQuotes } from '../TradeInput/components/TradeQuotes/TradeQuotes'
import { BackButton } from '../WithBackButton'

import { Display } from '@/components/Display'
import { useQuoteSortOptions } from '@/state/slices/tradeQuoteSlice/hooks'
import { selectIsRefreshPolling } from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppSelector } from '@/state/store'
const chevronDownIcon = <ChevronDownIcon />

type QuoteListProps = {
  onBack?: () => void
  cardProps?: CardProps
}

const cardBgProp = { base: 'background.surface.base', md: 'background.surface.raised.accent' }
const cardBorderRadius = { base: '0', md: '2xl' }
const cardMinHeight = { base: 'calc(100vh - var(--mobile-nav-offset))', md: 'initial' }

export const QuoteList: React.FC<QuoteListProps> = ({ onBack, cardProps }) => {
  const translate = useTranslate()

  const currentSortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)

  const quoteSortOptions = useQuoteSortOptions()
  const selectedSortOption = useMemo(
    (): { label: string } | undefined =>
      quoteSortOptions.find(opt => opt.value === currentSortOption),
    [currentSortOption, quoteSortOptions],
  )

  const sortByTextColor = useColorModeValue('blackAlpha.500', 'whiteAlpha.500')
  const isRefreshPolling = useAppSelector(selectIsRefreshPolling)

  return (
    <Card {...cardProps} bg={cardBgProp} borderRadius={cardBorderRadius} minHeight={cardMinHeight}>
      <CardHeader px={4} pt={4} display='flex' alignItems='center' justifyContent='space-between'>
        <Flex alignItems={'center'} gap={2}>
          {onBack && <BackButton ml={-2} onClick={onBack} />}
          <Heading fontSize='md'>{translate('trade.availableSwappers')}</Heading>
        </Flex>
        <Flex alignItems='center' gap={2}>
          <Display.Desktop>
            <Text color={sortByTextColor} fontWeight='normal' fontSize='sm'>
              {translate('common.sortBy')}
            </Text>
          </Display.Desktop>
          <Menu>
            <MenuButton as={Button} size='sm' rightIcon={chevronDownIcon}>
              {selectedSortOption?.label ?? translate('common.sortBy')}
            </MenuButton>
            <MenuList zIndex='banner' maxWidth='230px'>
              <Box fontWeight='normal' fontSize='sm' px={4} pt={2} pb={3}>
                <Text whiteSpace='normal'>{translate('trade.sort.info')}</Text>
              </Box>

              <MenuOptionGroup type='radio' value={currentSortOption}>
                {quoteSortOptions.map(quoteSortOpt => (
                  <MenuItemOption
                    value={quoteSortOpt.value}
                    onClick={quoteSortOpt.handleClick}
                    fontSize='sm'
                  >
                    {quoteSortOpt.label}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
          {isRefreshPolling && <QuoteTimer />}
        </Flex>
      </CardHeader>
      <CardBody className='scroll-container' px={0} overflowY='auto' flex='1 1 auto'>
        <TradeQuotes onBack={onBack} />
      </CardBody>
    </Card>
  )
}

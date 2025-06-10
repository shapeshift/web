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
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeQuotes } from '../TradeInput/components/TradeQuotes/TradeQuotes'
import { BackButton } from '../WithBackButton'

import { useQuoteSortOptions } from '@/state/slices/tradeQuoteSlice/hooks'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppSelector } from '@/state/store'
const chevronDownIcon = <ChevronDownIcon />

type QuoteListProps = {
  onBack?: () => void
  isLoading: boolean
  cardProps?: CardProps
}

export const QuoteList: React.FC<QuoteListProps> = ({ onBack, isLoading, cardProps }) => {
  const translate = useTranslate()

  const currentSortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)

  const quoteSortOptions = useQuoteSortOptions()

  const selectedSortOption = useMemo(
    (): { label: string } | undefined =>
      quoteSortOptions.find(opt => opt.value === currentSortOption),
    [currentSortOption, quoteSortOptions],
  )

  return (
    <Card {...cardProps}>
      <CardHeader px={4} pt={4} display='flex' alignItems='center' justifyContent='space-between'>
        <Flex alignItems={'center'} gap={2}>
          {onBack && <BackButton ml={-2} onClick={onBack} />}
          <Heading fontSize='md'>{translate('trade.availableSwappers')}</Heading>
        </Flex>
        <Flex alignItems='center' gap={2}>
          <Text color='whiteAlpha.500' fontWeight='normal' fontSize='sm'>
            {translate('common.sortBy')}
          </Text>
          <Menu>
            <MenuButton as={Button} size='sm' rightIcon={chevronDownIcon}>
              {selectedSortOption?.label ?? translate('common.sortBy')}
            </MenuButton>
            <MenuList zIndex='banner' maxWidth='230px'>
              <Box fontWeight='normal' fontSize='sm' px={4} pt={2} pb={3}>
                <Text whiteSpace='normal'>{translate('trade.sort.info')}</Text>
              </Box>

              <MenuOptionGroup type='radio' value={currentSortOption}>
                {quoteSortOptions.map(opt => (
                  <MenuItemOption value={opt.value} onClick={opt.handleClick} fontSize='sm'>
                    {opt.label}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Flex>
      </CardHeader>
      <CardBody className='scroll-container' px={0} overflowY='auto' flex='1 1 auto'>
        <TradeQuotes isLoading={isLoading} onBack={onBack} />
      </CardBody>
    </Card>
  )
}

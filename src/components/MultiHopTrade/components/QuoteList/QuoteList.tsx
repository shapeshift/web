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
import { DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL } from 'packages/swapper/src/constants'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { CountdownSpinner } from '../TradeInput/components/TradeQuotes/components/CountdownSpinner'
import { TradeQuotes } from '../TradeInput/components/TradeQuotes/TradeQuotes'
import { BackButton } from '../WithBackButton'

import { selectIsTradeQuoteApiQueryPending } from '@/state/apis/swapper/selectors'
import { swapperApi } from '@/state/apis/swapper/swapperApi'
import { useQuoteSortOptions } from '@/state/slices/tradeQuoteSlice/hooks'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
const chevronDownIcon = <ChevronDownIcon />

type QuoteListProps = {
  onBack?: () => void
  cardProps?: CardProps
}

export const QuoteList: React.FC<QuoteListProps> = ({ onBack, cardProps }) => {
  const translate = useTranslate()

  const currentSortOption = useAppSelector(tradeQuoteSlice.selectors.selectQuoteSortOption)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)

  const dispatch = useAppDispatch()

  const quoteSortOptions = useQuoteSortOptions()

  const showRefreshSpinner = Object.values(isTradeQuoteApiQueryPending).some(isPending => isPending)
  const handleRefreshQuotes = useCallback((): void => {
    dispatch(swapperApi.util.invalidateTags(['TradeQuote']))
  }, [dispatch])

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
          <Text color='text.subtle' fontWeight='normal' fontSize='sm'>
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
          <CountdownSpinner
            isLoading={showRefreshSpinner}
            initialTimeMs={DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL}
            onComplete={handleRefreshQuotes}
          />
        </Flex>
      </CardHeader>
      <CardBody className='scroll-container' px={0} overflowY='auto' flex='1 1 auto'>
        <TradeQuotes onBack={onBack} />
      </CardBody>
    </Card>
  )
}

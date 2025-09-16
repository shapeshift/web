import { Button, Flex, Icon, Stack } from '@chakra-ui/react'
import identity from 'lodash/identity'
import sortBy from 'lodash/sortBy'
import { FaCheck } from 'react-icons/fa'

import { RawText, Text } from '@/components/Text'
import type { SupportedFiatCurrencies } from '@/lib/market-service'
import { SupportedFiatCurrenciesList } from '@/lib/market-service'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const DrawerFiatCurrencies = () => {
  const dispatch = useAppDispatch()
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const defaultCurrency: SupportedFiatCurrencies = 'USD'
  const allFiatCurrencies = sortBy(SupportedFiatCurrenciesList, item =>
    // keep default currency at the top of the list
    item === defaultCurrency ? defaultCurrency : identity,
  )
  const { setSelectedCurrency } = preferences.actions

  return (
    <Stack width='full' p={0} spacing={2}>
      {allFiatCurrencies.map(currency => {
        const active = currency === selectedCurrency
        const buttonProps = active
          ? {
              isDisabled: true,
              _disabled: { opacity: 1 },
            }
          : {
              pl: 8,
              variant: 'ghost',
              onClick: () => dispatch(setSelectedCurrency({ currency })),
            }
        return (
          <Button width='full' justifyContent='flexStart' key={currency} {...buttonProps}>
            <Flex alignItems='center' textAlign='left'>
              {active && <Icon as={FaCheck} color='blue.500' />}
              <Flex ml={4}>
                <RawText>{currency}</RawText>
                <RawText mx={2}>-</RawText>
                <Text translation={`modals.settings.currencies.${currency}`} />
              </Flex>
            </Flex>
          </Button>
        )
      })}
    </Stack>
  )
}

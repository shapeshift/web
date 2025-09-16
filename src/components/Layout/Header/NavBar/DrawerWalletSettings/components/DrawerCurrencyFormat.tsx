import { Button, Flex, Icon, Stack } from '@chakra-ui/react'
import sortBy from 'lodash/sortBy'
import { FaCheck } from 'react-icons/fa'

import { currencyFormatsRepresenter } from '@/components/Modals/Settings/SettingsCommon'
import { RawText } from '@/components/Text'
import { CurrencyFormats, preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const DrawerCurrencyFormat = () => {
  const dispatch = useAppDispatch()
  const currentCurrencyFormat = useAppSelector(preferences.selectors.selectCurrencyFormat)
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const formats = sortBy(CurrencyFormats, format =>
    currencyFormatsRepresenter(format, selectedCurrency),
  )
  const { setCurrencyFormat } = preferences.actions

  return (
    <Stack width='full' p={0} spacing={2}>
      {formats.map(currencyFormat => {
        const active = currencyFormat === currentCurrencyFormat
        const buttonProps = active
          ? {
              isDisabled: true,
              _disabled: { opacity: 1 },
            }
          : {
              pl: 8,
              variant: 'ghost',
              onClick: () => dispatch(setCurrencyFormat({ currencyFormat })),
            }
        return (
          <Button width='full' justifyContent='flexStart' key={currencyFormat} {...buttonProps}>
            <Flex alignItems='center' textAlign='left'>
              {active && <Icon as={FaCheck} color='blue.500' />}
              <Flex ml={4}>
                <RawText>{currencyFormatsRepresenter(currencyFormat, selectedCurrency)}</RawText>
              </Flex>
            </Flex>
          </Button>
        )
      })}
    </Stack>
  )
}

import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, ModalBody, ModalHeader } from '@chakra-ui/react'
import type { SupportedFiatCurrencies } from '@keepkey/market-service'
import { SupportedFiatCurrenciesList } from '@keepkey/market-service'
import identity from 'lodash/identity'
import sortBy from 'lodash/sortBy'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const FiatCurrencies = () => {
  const dispatch = useAppDispatch()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const translate = useTranslate()
  const history = useHistory()
  const { goBack } = history
  const defaultCurrency: SupportedFiatCurrencies = 'USD'
  const allFiatCurrencies = sortBy(SupportedFiatCurrenciesList, item =>
    // keep default currency at the top of the list
    item === defaultCurrency ? defaultCurrency : identity,
  )
  const { setSelectedCurrency } = preferences.actions

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={goBack}
      />
      <ModalHeader textAlign='center'>{translate('modals.settings.currency')}</ModalHeader>
      <>
        <ModalBody
          alignItems='center'
          justifyContent='center'
          textAlign='center'
          maxHeight='400'
          overflowY='auto'
          overflowX='hidden'
        >
          {allFiatCurrencies.map(currency => {
            const active = currency === selectedCurrency
            const buttonProps = active
              ? {
                  disabled: true,
                  _disabled: { opacity: 1 },
                }
              : {
                  pl: 8,
                  variant: 'ghost',
                  onClick: () => dispatch(setSelectedCurrency({ currency })),
                }
            return (
              <Button
                width='full'
                justifyContent='flexStart'
                key={currency}
                mb={2}
                {...buttonProps}
              >
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
        </ModalBody>
      </>
    </SlideTransition>
  )
}

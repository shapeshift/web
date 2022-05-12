import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, ModalBody, ModalHeader } from '@chakra-ui/react'
import { SupportedFiatCurrencies, SupportedFiatCurrenciesList } from '@shapeshiftoss/market-service'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const FiatCurrencies = (props: RouteComponentProps) => {
  const dispatch = useAppDispatch()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const translate = useTranslate()
  const { goBack } = props.history
  const otherCurrencies = SupportedFiatCurrenciesList.filter(
    (k: SupportedFiatCurrencies) => k !== selectedCurrency,
  )

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
          <Button
            disabled={true}
            width='full'
            justifyContent='flexStart'
            mb={2}
            _disabled={{ opacity: 1 }}
          >
            <Flex alignItems='center' textAlign='left'>
              <Icon as={FaCheck} color='blue.500' />
              <Flex ml={4}>
                <RawText>{selectedCurrency}</RawText>
                <RawText mx={2}>-</RawText>
                <Text translation={`modals.settings.currencies.${selectedCurrency}`} />
              </Flex>
            </Flex>
          </Button>
          {otherCurrencies.map((currency: SupportedFiatCurrencies) => (
            <Button
              width='full'
              justifyContent='flexStart'
              pl={12}
              key={currency}
              variant='ghost'
              onClick={() => {
                dispatch(
                  preferences.actions.setSelectedCurrency({
                    currency,
                  }),
                )
              }}
            >
              <RawText>{currency}</RawText>
              <RawText mx={2}>-</RawText>
              <Text translation={`modals.settings.currencies.${currency}`} />
            </Button>
          ))}
        </ModalBody>
      </>
    </SlideTransition>
  )
}

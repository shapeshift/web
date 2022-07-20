import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, ModalBody, ModalHeader } from '@chakra-ui/react'
import { identity } from 'lodash'
import sortBy from 'lodash/sortBy'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { CurrencyFormats, preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectCurrencyFormat } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { currnecyFormatsRepresenter } from './SettingsCommon'

export const CurrencyFormat = () => {
  const dispatch = useAppDispatch()
  const currentCurrencyFormat = useAppSelector(selectCurrencyFormat)
  const translate = useTranslate()
  const history = useHistory()
  const { goBack } = history
  const defaultCurrencyFormat: CurrencyFormats = CurrencyFormats.DotDecimal
  const otherCurrencies = sortBy(CurrencyFormats, identity).filter(
    (k): k is CurrencyFormats => ![currentCurrencyFormat, defaultCurrencyFormat].includes(k),
  )
  currentCurrencyFormat !== defaultCurrencyFormat && otherCurrencies.unshift(defaultCurrencyFormat)
  const { setCurrencyFormat } = preferences.actions

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
      <ModalHeader textAlign='center'>{translate('modals.settings.currencyFormat')}</ModalHeader>
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
                <RawText>{currnecyFormatsRepresenter[currentCurrencyFormat]}</RawText>
              </Flex>
            </Flex>
          </Button>
          {otherCurrencies.map(currencyFormat => (
            <Button
              width='full'
              justifyContent='flexStart'
              pl={12}
              key={currencyFormat}
              variant='ghost'
              onClick={() => dispatch(setCurrencyFormat({ currencyFormat }))}
            >
              <RawText>{currnecyFormatsRepresenter[currencyFormat]}</RawText>
            </Button>
          ))}
        </ModalBody>
      </>
    </SlideTransition>
  )
}

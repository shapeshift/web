import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, ModalBody, ModalHeader } from '@chakra-ui/react'
import sortBy from 'lodash/sortBy'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { currencyFormatsRepresenter } from './SettingsCommon'

import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { CurrencyFormats, preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectCurrencyFormat, selectSelectedCurrency } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const arrowBackIcon = <ArrowBackIcon />

export const CurrencyFormat = () => {
  const dispatch = useAppDispatch()
  const currentCurrencyFormat = useAppSelector(selectCurrencyFormat)
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const translate = useTranslate()
  const history = useHistory()
  const { goBack } = history
  const formats = sortBy(CurrencyFormats, format =>
    currencyFormatsRepresenter(format, selectedCurrency),
  )
  const { setCurrencyFormat } = preferences.actions

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
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
              <Button
                mb={2}
                width='full'
                justifyContent='flexStart'
                key={currencyFormat}
                {...buttonProps}
              >
                <Flex alignItems='center' textAlign='left'>
                  {active && <Icon as={FaCheck} color='blue.500' />}
                  <Flex ml={4}>
                    <RawText>
                      {currencyFormatsRepresenter(currencyFormat, selectedCurrency)}
                    </RawText>
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

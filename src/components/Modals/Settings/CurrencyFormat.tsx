import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import sortBy from 'lodash/sortBy'
import { useCallback } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { currencyFormatsRepresenter } from './SettingsCommon'

import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { CurrencyFormats, preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const arrowBackIcon = <ArrowBackIcon />

type CurrencyFormatProps = {
  isDrawer?: boolean
}

export const CurrencyFormat = ({ isDrawer = false }: CurrencyFormatProps) => {
  const dispatch = useAppDispatch()
  const currentCurrencyFormat = useAppSelector(preferences.selectors.selectCurrencyFormat)
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const translate = useTranslate()
  const navigate = useNavigate()
  const formats = sortBy(CurrencyFormats, format =>
    currencyFormatsRepresenter(format, selectedCurrency),
  )
  const { setCurrencyFormat } = preferences.actions

  const handleGoBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  if (isDrawer) {
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
        onClick={handleGoBack}
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

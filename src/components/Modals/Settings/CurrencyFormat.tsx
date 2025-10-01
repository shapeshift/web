import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, Stack } from '@chakra-ui/react'
import sortBy from 'lodash/sortBy'
import { useCallback, useMemo } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { MaybeDrawerProps } from './SettingsCommon'
import { currencyFormatsRepresenter } from './SettingsCommon'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
} from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { CurrencyFormats, preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const arrowBackIcon = <ArrowBackIcon />

export const CurrencyFormat = ({ isDrawer = false }: MaybeDrawerProps) => {
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

  const formatButtons = useMemo(
    () =>
      formats.map(currencyFormat => {
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
            mb={isDrawer ? 0 : 2}
            width='full'
            justifyContent='flexStart'
            key={currencyFormat}
            {...buttonProps}
          >
            <Flex alignItems='center' textAlign='left'>
              {active && <Icon as={FaCheck} color='blue.500' />}
              <Flex ml={4}>
                <RawText>{currencyFormatsRepresenter(currencyFormat, selectedCurrency)}</RawText>
              </Flex>
            </Flex>
          </Button>
        )
      }),
    [formats, currentCurrencyFormat, dispatch, setCurrencyFormat, selectedCurrency, isDrawer],
  )

  if (isDrawer) {
    return (
      <Stack width='full' p={0} spacing={2}>
        {formatButtons}
      </Stack>
    )
  }

  return (
    <SlideTransition>
      <DialogHeader textAlign='center' pt={6}>
        <DialogHeaderLeft>
          <IconButton
            variant='ghost'
            icon={arrowBackIcon}
            aria-label={translate('common.back')}
            position='absolute'
            top={6}
            left={3}
            fontSize='xl'
            size='sm'
            isRound
            onClick={handleGoBack}
          />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>{translate('modals.settings.currencyFormat')}</DialogHeaderMiddle>
      </DialogHeader>
      <>
        <DialogBody
          alignItems='center'
          justifyContent='center'
          textAlign='center'
          maxHeight='400'
          overflowY='auto'
          overflowX='hidden'
        >
          {formatButtons}
        </DialogBody>
      </>
    </SlideTransition>
  )
}

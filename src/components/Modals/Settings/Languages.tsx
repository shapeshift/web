import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { MaybeDrawerProps } from './SettingsCommon'

import { locales } from '@/assets/translations/constants'
import { getLocaleLabel } from '@/assets/translations/utils'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
} from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const arrowBackIcon = <ArrowBackIcon />
const disabledProps = { opacity: 1 }

export const Languages = ({ isDrawer = false }: MaybeDrawerProps) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const translate = useTranslate()
  const otherLocales = locales.filter(l => l.key !== selectedLocale)

  const handleGoBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const selectedLocaleButton = useMemo(
    () => (
      <Button
        disabled={true}
        width='full'
        justifyContent='flexStart'
        mb={isDrawer ? 0 : 2}
        _disabled={disabledProps}
      >
        <Flex alignItems='center' textAlign='left'>
          <Icon as={FaCheck} color='blue.500' />
          <RawText ml={4}>{getLocaleLabel(selectedLocale)}</RawText>
        </Flex>
      </Button>
    ),
    [selectedLocale, isDrawer],
  )

  const otherLocaleButtons = useMemo(
    () =>
      otherLocales.map(locale => (
        <Button
          width='full'
          justifyContent='flexStart'
          pl={isDrawer ? 8 : 12}
          key={locale.key}
          variant='ghost'
          data-test={`locale-${locale.key}-button`}
          // eslint-disable-next-line react-memo/require-usememo
          onClick={() => {
            dispatch(preferences.actions.setSelectedLocale({ locale: locale.key }))
          }}
        >
          <RawText>{locale.label}</RawText>
        </Button>
      )),
    [otherLocales, dispatch, isDrawer],
  )

  if (isDrawer) {
    return (
      <Stack width='full' p={0} spacing={2}>
        {selectedLocaleButton}
        {otherLocaleButtons}
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
        <DialogHeaderMiddle>{translate('modals.settings.language')}</DialogHeaderMiddle>
      </DialogHeader>
      <>
        <DialogBody alignItems='center' justifyContent='center' textAlign='center'>
          {selectedLocaleButton}
          {otherLocaleButtons}
        </DialogBody>
      </>
    </SlideTransition>
  )
}

import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, ModalBody, ModalHeader } from '@chakra-ui/react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { locales } from '@/assets/translations/constants'
import { getLocaleLabel } from '@/assets/translations/utils'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const arrowBackIcon = <ArrowBackIcon />
const disabledProps = { opacity: 1 }

export const Languages = () => {
  const dispatch = useAppDispatch()
  const history = useHistory()
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const translate = useTranslate()
  const otherLocales = locales.filter(l => l.key !== selectedLocale)
  const { goBack } = history

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
      <ModalHeader textAlign='center'>{translate('modals.settings.language')}</ModalHeader>
      <>
        <ModalBody alignItems='center' justifyContent='center' textAlign='center'>
          <Button
            disabled={true}
            width='full'
            justifyContent='flexStart'
            mb={2}
            _disabled={disabledProps}
          >
            <Flex alignItems='center' textAlign='left'>
              <Icon as={FaCheck} color='blue.500' />
              <RawText ml={4}>{getLocaleLabel(selectedLocale)}</RawText>
            </Flex>
          </Button>
          {otherLocales.map(locale => (
            <Button
              width='full'
              justifyContent='flexStart'
              pl={12}
              key={locale.key}
              variant='ghost'
              data-test={`locale-${locale.key}-button`}
              // we need to pass an arg here, so we need an anonymous function wrapper
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => {
                dispatch(preferences.actions.setSelectedLocale({ locale: locale.key }))
              }}
            >
              <RawText>{locale.label}</RawText>
            </Button>
          ))}
        </ModalBody>
      </>
    </SlideTransition>
  )
}

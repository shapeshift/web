import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Flex, Icon, IconButton, ModalBody, ModalHeader } from '@chakra-ui/react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps, useHistory } from 'react-router-dom'
import { RawText } from 'components/Text'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SettingsRoutes } from './Settings'

/**
 * Probably needs a better home
 */
export const locales = [
  {
    key: 'en',
    label: 'English'
  },
  {
    key: 'es',
    label: 'Español'
  },
  {
    key: 'fr',
    label: 'français'
  },
  {
    key: 'id',
    label: 'Bahasa Indonesia'
  },
  {
    key: 'ko',
    label: '한국어'
  },
  {
    key: 'pt',
    label: 'Português'
  },
  {
    key: 'ru',
    label: 'Русский язык'
  },
  {
    key: 'zh',
    label: '中文'
  }
]

export const Languages = (props: RouteComponentProps) => {
  const dispatch = useAppDispatch()
  const history = useHistory()
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const translate = useTranslate()
  const otherLocales = locales.filter(l => l.key !== selectedLocale)
  const back = () => history.push(SettingsRoutes.Index)

  return (
    <>
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
        onClick={() => back()}
      />
      <ModalHeader textAlign='center'>{translate('modals.settings.language')}</ModalHeader>
      <>
        <ModalBody alignItems='center' justifyContent='center' textAlign='center'>
          <Flex alignItems='center' textAlign='left' mb={2}>
            <Icon as={FaCheck} color='blue.500' />
            <RawText ml={4}>{locales.find(l => l.key === selectedLocale)?.label}</RawText>
          </Flex>
          {otherLocales.map(locale => (
            <Button
              width='full'
              justifyContent='flexStart'
              pl={8}
              key={locale.key}
              variant='ghost'
              onClick={() => {
                back()
                dispatch(preferences.actions.setSelectedLocale({ locale: locale.key }))
              }}
            >
              <RawText>{locale.label}</RawText>
            </Button>
          ))}
        </ModalBody>
      </>
    </>
  )
}

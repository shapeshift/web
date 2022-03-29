import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import {
  Divider,
  Flex,
  Icon,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  Stack,
  Switch,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react'
import { FaGreaterThanEqual } from 'react-icons/fa'
import { IoDocumentTextOutline, IoLockClosed } from 'react-icons/io5'
import { MdChevronRight, MdLanguage } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { getLocaleLabel } from '../../../assets/translations/utils'
import { BalanceThresholdInput } from './BalanceThresholdInput'
import { SettingsRoutes } from './Settings'
import { SettingsListItem } from './SettingsListItem'

type SettingsListProps = {
  appHistory: RouteComponentProps['history']
} & RouteComponentProps

export const SettingsList = ({ appHistory, ...routeProps }: SettingsListProps) => {
  const translate = useTranslate()
  const { settings } = useModal()
  const { toggleColorMode } = useColorMode()
  const isLightMode = useColorModeValue(true, false)
  const selectedLocale = useAppSelector(selectSelectedLocale)
  // for both locale and currency
  const selectedPreferenceValueColor = useColorModeValue('blue.500', 'blue.200')

  const closeModalAndNavigateTo = (linkHref: string) => {
    settings.close()
    appHistory.push(linkHref)
  }

  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>{translate('modals.settings.settings')}</ModalHeader>
      <ModalCloseButton />
      <ModalBody alignItems='center' justifyContent='center' textAlign='center' pt={0} px={0}>
        <Stack width='full' p={0}>
          <Divider my={1} />
          <SettingsListItem
            label={isLightMode ? 'common.lightTheme' : 'common.darkTheme'}
            onClick={toggleColorMode}
            icon={<Icon as={isLightMode ? SunIcon : MoonIcon} color='gray.500' />}
          >
            <Switch isChecked={isLightMode} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          {/* TODO(stackedQ): the following condition should be removed after
          implementing language translations and balance threshold functionality
          for assets page, accounts page, and portfolio charts, balances, and assets. */}
          {false && (
            <>
              <SettingsListItem
                label='modals.settings.language'
                onClick={() => routeProps.history.push(SettingsRoutes.Languages)}
                icon={<Icon as={MdLanguage} color='gray.500' />}
              >
                <Flex alignItems='center'>
                  <RawText color={selectedPreferenceValueColor} lineHeight={1} fontSize='sm'>
                    {getLocaleLabel(selectedLocale)}
                  </RawText>
                  <MdChevronRight color='gray.500' size='1.5em' />
                </Flex>
              </SettingsListItem>
              <Divider my={1} />
              <SettingsListItem
                label='modals.settings.balanceThreshold'
                icon={<Icon as={FaGreaterThanEqual} color='gray.500' />}
                tooltipText='modals.settings.balanceThresholdTooltip'
              >
                <BalanceThresholdInput />
              </SettingsListItem>
              <Divider my={1} />
            </>
          )}
          <SettingsListItem
            label='common.terms'
            onClick={() => closeModalAndNavigateTo('/legal/terms-of-service')}
            icon={<Icon as={IoLockClosed} color='gray.500' />}
          />
          <Divider my={1} />
          <SettingsListItem
            label='common.privacy'
            onClick={() => closeModalAndNavigateTo('/legal/privacy-policy')}
            icon={<Icon as={IoDocumentTextOutline} color='gray.500' />}
          />
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}

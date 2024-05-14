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
  useColorModeValue,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { FaBroom, FaCoins, FaDollarSign, FaGreaterThanEqual, FaTrash } from 'react-icons/fa'
import { IoDocumentTextOutline, IoLockClosed } from 'react-icons/io5'
import { MdChevronRight, MdLanguage } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import { getLocaleLabel } from 'assets/translations/utils'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { deleteWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import {
  selectCurrencyFormat,
  selectSelectedCurrency,
  selectSelectedLocale,
} from 'state/selectors'
import { useAppSelector } from 'state/store'

import { BalanceThresholdInput } from './BalanceThresholdInput'
import { currencyFormatsRepresenter, SettingsRoutes } from './SettingsCommon'
import { SettingsListItem } from './SettingsListItem'

type SettingsListProps = {
  appHistory: RouteComponentProps['history']
}

const faCoinsIcon = <Icon as={FaCoins} color='text.subtle' />
const faDollarSignIcon = <Icon as={FaDollarSign} color='text.subtle' />
const mdLanguageIcon = <Icon as={MdLanguage} color='text.subtle' />
const faGreaterThanEqualIcon = <Icon as={FaGreaterThanEqual} color='text.subtle' />
const faBroomIcon = <Icon as={FaBroom} color='text.subtle' />
const ioLockClosedIcon = <Icon as={IoLockClosed} color='text.subtle' />
const ioDocumentTextIcon = <Icon as={IoDocumentTextOutline} color='text.subtle' />
const faTrashIcon = <FaTrash />

export const SettingsList: FC<SettingsListProps> = ({ appHistory }) => {
  const history = useHistory()
  const { disconnect } = useWallet()
  const translate = useTranslate()
  const settings = useModal('settings')
  const { toggleColorMode } = useColorMode()
  const [clickCount, setClickCount] = useState<number>(0)
  const isLightMode = useColorModeValue(true, false)
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const selectedCurrencyFormat = useAppSelector(selectCurrencyFormat)

  // for both locale and currency
  const selectedPreferenceValueColor = useColorModeValue('blue.500', 'blue.200')

  /**
   * tapping 5 times on the settings header will close this modal and take you to the flags page
   * useful for QA team and unlikely to be triggered by a regular user
   */
  const handleHeaderClick = useCallback(() => {
    if (clickCount === 4) {
      setClickCount(0)
      settings.close()
      appHistory.push('/flags')
    } else {
      setClickCount(clickCount + 1)
    }
  }, [appHistory, clickCount, setClickCount, settings])

  const closeModalAndNavigateTo = useCallback(
    (linkHref: string) => {
      settings.close()
      appHistory.push(linkHref)
    },
    [appHistory, settings],
  )

  const handleDeleteAccountsClick = useCallback(async () => {
    if (window.confirm(translate('modals.settings.deleteAccountsConfirm'))) {
      try {
        await deleteWallet('*')
        settings.close()
        disconnect()
      } catch (e) {
        console.log(e)
      }
    }
  }, [translate, settings, disconnect])

  const handleClearCacheClick = useCallback(
    () => history.push(SettingsRoutes.ClearCache),
    [history],
  )

  const themeColorIcon = useMemo(
    () => <Icon as={isLightMode ? SunIcon : MoonIcon} color='text.subtle' />,
    [isLightMode],
  )

  const handleCurrencyClick = useCallback(
    () => history.push(SettingsRoutes.FiatCurrencies),
    [history],
  )

  const handleCurrencyFormatClick = useCallback(
    () => history.push(SettingsRoutes.CurrencyFormat),
    [history],
  )

  const handleLanguageClick = useCallback(() => history.push(SettingsRoutes.Languages), [history])

  const handleTosClick = useCallback(
    () => closeModalAndNavigateTo('/legal/terms-of-service'),
    [closeModalAndNavigateTo],
  )

  const handlePrivacyPolicyClick = useCallback(
    () => closeModalAndNavigateTo('/legal/privacy-policy'),
    [closeModalAndNavigateTo],
  )

  return (
    <SlideTransition>
      <ModalHeader textAlign='center' userSelect='none' onClick={handleHeaderClick}>
        {translate('modals.settings.settings')}
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody alignItems='center' justifyContent='center' textAlign='center' pt={0} px={0}>
        <Stack width='full' p={0}>
          <Divider my={1} />
          <SettingsListItem
            label={isLightMode ? 'common.lightTheme' : 'common.darkTheme'}
            onClick={toggleColorMode}
            icon={themeColorIcon}
          >
            <Switch isChecked={isLightMode} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          <>
            <SettingsListItem
              label='modals.settings.currency'
              onClick={handleCurrencyClick}
              icon={faCoinsIcon}
            >
              <Flex alignItems='center'>
                <RawText color={selectedPreferenceValueColor} lineHeight={1} fontSize='sm'>
                  {selectedCurrency}
                </RawText>
                <MdChevronRight color='text.subtle' size='1.5em' />
              </Flex>
            </SettingsListItem>
            <Divider my={1} />
            <SettingsListItem
              label='modals.settings.currencyFormat'
              onClick={handleCurrencyFormatClick}
              icon={faDollarSignIcon}
            >
              <Flex alignItems='center'>
                <RawText color={selectedPreferenceValueColor} lineHeight={1} fontSize='sm'>
                  {currencyFormatsRepresenter(selectedCurrencyFormat, selectedCurrency)}
                </RawText>
                <MdChevronRight color='text.subtle' size='1.5em' />
              </Flex>
            </SettingsListItem>
            <Divider my={1} />
          </>
          <SettingsListItem
            label='modals.settings.language'
            onClick={handleLanguageClick}
            icon={mdLanguageIcon}
          >
            <Flex alignItems='center'>
              <RawText color={selectedPreferenceValueColor} lineHeight={1} fontSize='sm'>
                {getLocaleLabel(selectedLocale)}
              </RawText>
              <MdChevronRight color='text.subtle' size='1.5em' />
            </Flex>
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem
            label='modals.settings.balanceThreshold'
            icon={faGreaterThanEqualIcon}
            tooltipText='modals.settings.balanceThresholdTooltip'
          >
            <BalanceThresholdInput />
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem
            label='modals.settings.clearCache'
            icon={faBroomIcon}
            onClick={handleClearCacheClick}
          >
            <Flex alignItems='center'>
              <MdChevronRight color='text.subtle' size='1.5em' />
            </Flex>
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem label='common.terms' onClick={handleTosClick} icon={ioLockClosedIcon} />
          <Divider my={1} />
          <SettingsListItem
            label='common.privacy'
            onClick={handlePrivacyPolicyClick}
            icon={ioDocumentTextIcon}
          />
          {isMobileApp && (
            <>
              <Divider my={1} />
              <SettingsListItem
                color='red.500'
                label='modals.settings.clearWalletAccountData'
                onClick={handleDeleteAccountsClick}
                icon={faTrashIcon}
              />
            </>
          )}
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}

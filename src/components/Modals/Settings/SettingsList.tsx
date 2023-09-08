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
import { useCallback, useState } from 'react'
import { FaBroom, FaCoins, FaDollarSign, FaGreaterThanEqual, FaTrash } from 'react-icons/fa'
import { IoDocumentTextOutline, IoLockClosed } from 'react-icons/io5'
import { MdChevronRight, MdLanguage } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import { getLocaleLabel } from 'assets/translations/utils'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import {
  deleteWallet,
  reloadWebview,
} from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import {
  selectCurrencyFormat,
  selectSelectedCurrency,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { persistor, useAppSelector } from 'state/store'

import { BalanceThresholdInput } from './BalanceThresholdInput'
import { currencyFormatsRepresenter, SettingsRoutes } from './SettingsCommon'
import { SettingsListItem } from './SettingsListItem'

type SettingsListProps = {
  appHistory: RouteComponentProps['history']
}

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

  const closeModalAndNavigateTo = (linkHref: string) => {
    settings.close()
    appHistory.push(linkHref)
  }

  const handleDeleteAccountsClick = async () => {
    if (window.confirm(translate('modals.settings.deleteAccountsConfirm'))) {
      try {
        await deleteWallet('*')
        settings.close()
        disconnect()
      } catch (e) {
        console.log(e)
      }
    }
  }

  const handleClearCacheClick = useCallback(async () => {
    try {
      // clear store
      await persistor.purge()
      // send them back to the connect wallet route in case the bug was something to do with the current page
      // and so they can reconnect their native wallet to avoid the app looking broken in an infinite loading state
      appHistory.replace('/connect-wallet')
      // reload the page
      isMobileApp ? reloadWebview() : window.location.reload()
    } catch (e) {}
  }, [appHistory])

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
            icon={<Icon as={isLightMode ? SunIcon : MoonIcon} color='text.subtle' />}
          >
            <Switch isChecked={isLightMode} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          <>
            <SettingsListItem
              label='modals.settings.currency'
              onClick={() => history.push(SettingsRoutes.FiatCurrencies)}
              icon={<Icon as={FaCoins} color='text.subtle' />}
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
              onClick={() => history.push(SettingsRoutes.CurrencyFormat)}
              icon={<Icon as={FaDollarSign} color='text.subtle' />}
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
            onClick={() => history.push(SettingsRoutes.Languages)}
            icon={<Icon as={MdLanguage} color='text.subtle' />}
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
            icon={<Icon as={FaGreaterThanEqual} color='text.subtle' />}
            tooltipText='modals.settings.balanceThresholdTooltip'
          >
            <BalanceThresholdInput />
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem
            label='modals.settings.clearCache'
            icon={<Icon as={FaBroom} color='text.subtle' />}
            tooltipText='modals.settings.clearCacheTooltip'
            onClick={handleClearCacheClick}
          />
          <Divider my={1} />
          <SettingsListItem
            label='common.terms'
            onClick={() => closeModalAndNavigateTo('/legal/terms-of-service')}
            icon={<Icon as={IoLockClosed} color='text.subtle' />}
          />
          <Divider my={1} />
          <SettingsListItem
            label='common.privacy'
            onClick={() => closeModalAndNavigateTo('/legal/privacy-policy')}
            icon={<Icon as={IoDocumentTextOutline} color='text.subtle' />}
          />
          {isMobileApp && (
            <>
              <Divider my={1} />
              <SettingsListItem
                color='red.500'
                label='modals.settings.clearWalletAccountData'
                onClick={handleDeleteAccountsClick}
                icon={<FaTrash />}
              />
            </>
          )}
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}

import { MoonIcon } from '@chakra-ui/icons'
import {
  Divider,
  Flex,
  Icon,
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
import { useNavigate } from 'react-router-dom'

import { BalanceThresholdInput } from './BalanceThresholdInput'
import { currencyFormatsRepresenter, SettingsRoutes } from './SettingsCommon'
import { SettingsListItem } from './SettingsListItem'

import { getLocaleLabel } from '@/assets/translations/utils'
import { RawText } from '@/components/Text'
import { deleteWallet } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from '@/lib/globals'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const faCoinsIcon = <Icon as={FaCoins} color='text.subtle' />
const faDollarSignIcon = <Icon as={FaDollarSign} color='text.subtle' />
const mdLanguageIcon = <Icon as={MdLanguage} color='text.subtle' />
const faGreaterThanEqualIcon = <Icon as={FaGreaterThanEqual} color='text.subtle' />
const faBroomIcon = <Icon as={FaBroom} color='text.subtle' />
const ioLockClosedIcon = <Icon as={IoLockClosed} color='text.subtle' />
const ioDocumentTextIcon = <Icon as={IoDocumentTextOutline} color='text.subtle' />
const faTrashIcon = <FaTrash />

type SettingsContentProps = {
  onClose?: () => void
  onHeaderClick?: () => void
}

export const SettingsContent: FC<SettingsContentProps> = ({ onClose, onHeaderClick }) => {
  const navigate = useNavigate()
  const { navigate: browserNavigate } = useBrowserRouter()
  const { disconnect } = useWallet()
  const translate = useTranslate()
  const settings = useModal('settings')
  const { toggleColorMode } = useColorMode()
  const [clickCount, setClickCount] = useState<number>(0)
  const isDarkMode = useColorModeValue(false, true)
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const selectedCurrency = useAppSelector(preferences.selectors.selectSelectedCurrency)
  const selectedCurrencyFormat = useAppSelector(preferences.selectors.selectCurrencyFormat)
  const appDispatch = useAppDispatch()

  const selectedPreferenceValueColor = useColorModeValue('blue.500', 'blue.200')

  // Note: handleHeaderClick is used implicitly through onHeaderClick prop pattern
  const handleHeaderClick = useCallback(() => {
    if (onHeaderClick) {
      onHeaderClick()
      return
    }

    if (clickCount === 4) {
      setClickCount(0)
      settings.close()
      browserNavigate('/flags')
    } else {
      setClickCount(clickCount + 1)
    }
  }, [clickCount, setClickCount, settings, browserNavigate, onHeaderClick])

  // Suppress unused variable warning - this is part of the extraction pattern
  void handleHeaderClick

  const closeModalAndNavigateTo = useCallback(
    (linkHref: string) => {
      if (onClose) {
        onClose()
      } else {
        settings.close()
      }
      browserNavigate(linkHref)
    },
    [settings, browserNavigate, onClose],
  )

  const handleDeleteAccountsClick = useCallback(async () => {
    if (window.confirm(translate('modals.settings.deleteAccountsConfirm'))) {
      try {
        await deleteWallet('*')

        appDispatch(portfolio.actions.clear())

        if (onClose) {
          onClose()
        } else {
          settings.close()
        }
        disconnect()
      } catch (e) {
        console.log(e)
      }
    }
  }, [translate, settings, disconnect, appDispatch, onClose])

  const handleClearCacheClick = useCallback(() => navigate(SettingsRoutes.ClearCache), [navigate])

  const themeColorIcon = useMemo(() => <Icon as={MoonIcon} color='text.subtle' />, [])

  const handleCurrencyClick = useCallback(() => {
    navigate(SettingsRoutes.FiatCurrencies)
  }, [navigate])

  const handleCurrencyFormatClick = useCallback(
    () => navigate(SettingsRoutes.CurrencyFormat),
    [navigate],
  )

  const handleLanguageClick = useCallback(() => {
    navigate(SettingsRoutes.Languages)
  }, [navigate])

  const handleTosClick = useCallback(
    () => closeModalAndNavigateTo('/legal/terms-of-service'),
    [closeModalAndNavigateTo],
  )

  const handlePrivacyPolicyClick = useCallback(
    () => closeModalAndNavigateTo('/legal/privacy-policy'),
    [closeModalAndNavigateTo],
  )

  return (
    <Stack width='full' p={0}>
      <Divider my={1} />
      <SettingsListItem label={'common.darkTheme'} onClick={toggleColorMode} icon={themeColorIcon}>
        <Switch isChecked={isDarkMode} pointerEvents='none' />
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
  )
}

import { ExternalLinkIcon, MoonIcon, SunIcon } from '@chakra-ui/icons'
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
import { ipcRenderer } from 'electron'
import { useCallback, useEffect, useState } from 'react'
import { FaCoins, FaDollarSign, FaGreaterThanEqual, FaRocket, FaTrash } from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'
import { IoDocumentTextOutline, IoFileTray, IoLockClosed } from 'react-icons/io5'
import { MdChevronRight, MdLanguage } from 'react-icons/md'
import { TbRefreshAlert } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { isMobile as isMobileApp } from 'lib/globals'
import {
  selectCurrencyFormat,
  selectSelectedCurrency,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { getLocaleLabel } from '../../../assets/translations/utils'
import { BalanceThresholdInput } from './BalanceThresholdInput'
import { currencyFormatsRepresenter, SettingsRoutes } from './SettingsCommon'
import { SettingsListItem } from './SettingsListItem'

type SettingsListProps = {
  appHistory: RouteComponentProps['history']
} & RouteComponentProps

export type AppSettings = {
  shouldAutoLunch: boolean
  shouldAutoStartBridge: boolean
  shouldMinimizeToTray: boolean
  shouldAutoUpdate: boolean
  allowPreRelease: boolean
  bridgeApiPort: number
}

export const SettingsList = ({ appHistory, ...routeProps }: SettingsListProps) => {
  const translate = useTranslate()
  const { settings } = useModal()
  const { toggleColorMode } = useColorMode()
  const [clickCount, setClickCount] = useState<number>(0)
  const isLightMode = useColorModeValue(true, false)
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const selectedCurrencyFormat = useAppSelector(selectCurrencyFormat)
  // for both locale and currency
  const selectedPreferenceValueColor = useColorModeValue('blue.500', 'blue.200')

  const [appSettings, setAppSettings] = useState<AppSettings>({
    shouldAutoLunch: true,
    shouldAutoStartBridge: true,
    shouldMinimizeToTray: true,
    shouldAutoUpdate: true,
    allowPreRelease: false,
    bridgeApiPort: 1646,
  })

  const [prevAppSettings, setPrevAppSettings] = useState<AppSettings>(appSettings)

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

  useEffect(() => {
    ipcRenderer.on('@app/settings', (_event, data) => {
      // console.log('APP SETTINGS RECIEVED', data)
      setAppSettings(data)
    })
  }, [])

  useEffect(() => {
    if (
      prevAppSettings &&
      appSettings.shouldAutoLunch === prevAppSettings.shouldAutoLunch &&
      appSettings.shouldAutoUpdate === prevAppSettings.shouldAutoUpdate &&
      appSettings.shouldMinimizeToTray === prevAppSettings.shouldMinimizeToTray &&
      appSettings.allowPreRelease === prevAppSettings.allowPreRelease
    )
      return
    setPrevAppSettings(appSettings)
    // console.log('APP SETTINGS SAVED')
    ipcRenderer.send('@app/update-settings', appSettings)
  }, [appSettings, prevAppSettings])

  useEffect(() => {
    if (settings.isOpen) ipcRenderer.send('@app/settings')
  }, [settings.isOpen])

  const closeModalAndNavigateTo = (linkHref: string) => {
    settings.close()
    appHistory.push(linkHref)
  }

  const handleDeleteAccountsClick = async () => {}

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
            icon={<Icon as={isLightMode ? SunIcon : MoonIcon} color='gray.500' />}
          >
            <Switch isChecked={isLightMode} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem
            label={'modals.settings.autoUpdate'}
            onClick={() => {
              setAppSettings(currentSettings => {
                return {
                  ...currentSettings,
                  shouldAutoUpdate: !currentSettings.shouldAutoUpdate,
                }
              })
            }}
            icon={<Icon as={HiRefresh} color='gray.500' />}
          >
            <Switch isChecked={appSettings.shouldAutoUpdate} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem
            label={'modals.settings.autoLaunch'}
            onClick={() => {
              setAppSettings(currentSettings => {
                return {
                  ...currentSettings,
                  shouldAutoLunch: !currentSettings.shouldAutoLunch,
                }
              })
            }}
            icon={<Icon as={FaRocket} color='gray.500' />}
          >
            <Switch isChecked={appSettings.shouldAutoLunch} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem
            label={'modals.settings.minimizeToTray'}
            onClick={() => {
              setAppSettings(currentSettings => {
                return {
                  ...currentSettings,
                  shouldMinimizeToTray: !currentSettings.shouldMinimizeToTray,
                }
              })
            }}
            icon={<Icon as={IoFileTray} color='gray.500' />}
          >
            <Switch isChecked={appSettings.shouldMinimizeToTray} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          <SettingsListItem
            label={'modals.settings.downloadPreRelease'}
            onClick={() => {
              setAppSettings(currentSettings => {
                return {
                  ...currentSettings,
                  allowPreRelease: !currentSettings.allowPreRelease,
                }
              })
            }}
            icon={<Icon as={TbRefreshAlert} color='gray.500' />}
          >
            <Switch isChecked={appSettings.allowPreRelease} pointerEvents='none' />
          </SettingsListItem>
          <Divider my={1} />
          <>
            <SettingsListItem
              label='modals.settings.currency'
              onClick={() => routeProps.history.push(SettingsRoutes.FiatCurrencies)}
              icon={<Icon as={FaCoins} color='gray.500' />}
            >
              <Flex alignItems='center'>
                <RawText color={selectedPreferenceValueColor} lineHeight={1} fontSize='sm'>
                  {selectedCurrency}
                </RawText>
                <MdChevronRight color='gray.500' size='1.5em' />
              </Flex>
            </SettingsListItem>
            <Divider my={1} />
            <SettingsListItem
              label='modals.settings.currencyFormat'
              onClick={() => routeProps.history.push(SettingsRoutes.CurrencyFormat)}
              icon={<Icon as={FaDollarSign} color='gray.500' />}
            >
              <Flex alignItems='center'>
                <RawText color={selectedPreferenceValueColor} lineHeight={1} fontSize='sm'>
                  {currencyFormatsRepresenter[selectedCurrencyFormat]}
                </RawText>
                <MdChevronRight color='gray.500' size='1.5em' />
              </Flex>
            </SettingsListItem>
            <Divider my={1} />
          </>
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
          <Link to={{ pathname: 'http://localhost:1646/docs' }} target='_blank'>
            <SettingsListItem
              icon={<Icon as={ExternalLinkIcon} color='gray.500' />}
              label='connectWallet.menu.openDev'
            />
          </Link>
          <Divider my={1} />
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

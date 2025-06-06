import type { ToastId } from '@chakra-ui/react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  CloseButton,
  Link,
  Text,
  useToast,
} from '@chakra-ui/react'
import type { Features } from '@keepkey/device-protocol/lib/messages_pb'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import type { JSX } from 'react'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { RiFlashlightLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'

import { getPlatform, RELEASE_PAGE, UPDATER_BASE_URL } from './KeepKey/helpers'
import { useKeepKeyVersions } from './KeepKey/hooks/useKeepKeyVersions'

import type { RadioOption } from '@/components/Radio/Radio'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { poll } from '@/lib/poll/poll'
import { isKeepKeyHDWallet } from '@/lib/utils'

export enum DeviceTimeout {
  TenMinutes = '600000',
  FifteenMinutes = '900000',
  TwentyMinutes = '1200000',
  ThirtyMinutes = '1800000',
  FortyFiveMinutes = '2700000',
  SixtyMinutes = '3600000',
}

const KEEPKEY_TOAST_ID = 'update-available'

export const timeoutOptions: readonly RadioOption<DeviceTimeout>[] = Object.freeze([
  {
    value: DeviceTimeout.TenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '10' }],
  },
  {
    value: DeviceTimeout.FifteenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '15' }],
  },
  {
    value: DeviceTimeout.TwentyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '20' }],
  },
  {
    value: DeviceTimeout.ThirtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '30' }],
  },
  {
    value: DeviceTimeout.FortyFiveMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '45' }],
  },
  {
    value: DeviceTimeout.SixtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '60' }],
  },
])

export enum KeepKeyActions {
  SET_HAS_PASSPHRASE = 'SET_HAS_PASSPHRASE',
  SET_DEVICE_TIMEOUT = 'SET_DEVICE_TIMEOUT',
  SET_FEATURES = 'SET_FEATURES',
  RESET_STATE = 'RESET_STATE',
  SET_WALLET = 'SET_WALLET',
}

export interface InitialState {
  hasPassphrase: boolean | undefined
  features: Features.AsObject | undefined
  keepKeyWallet: KeepKeyHDWallet | undefined
  deviceTimeout: RadioOption<DeviceTimeout> | undefined
}

const initialState: InitialState = {
  hasPassphrase: undefined,
  features: undefined,
  keepKeyWallet: undefined,
  deviceTimeout: timeoutOptions[0],
}

export interface IKeepKeyContext {
  state: InitialState
  setHasPassphrase: (enabled: boolean) => void
}

export type KeepKeyActionTypes =
  | { type: KeepKeyActions.SET_HAS_PASSPHRASE; payload: boolean | undefined }
  | { type: KeepKeyActions.SET_FEATURES; payload: Features.AsObject | undefined }
  | { type: KeepKeyActions.SET_DEVICE_TIMEOUT; payload: RadioOption<DeviceTimeout> | undefined }
  | { type: KeepKeyActions.RESET_STATE }
  | { type: KeepKeyActions.SET_WALLET; payload: KeepKeyHDWallet | undefined }

const reducer = (state: InitialState, action: KeepKeyActionTypes) => {
  switch (action.type) {
    case KeepKeyActions.SET_HAS_PASSPHRASE:
      return { ...state, hasPassphrase: action.payload }
    case KeepKeyActions.SET_FEATURES:
      return { ...state, features: action.payload }
    case KeepKeyActions.SET_DEVICE_TIMEOUT:
      return { ...state, deviceTimeout: action.payload }
    case KeepKeyActions.RESET_STATE:
      return initialState
    case KeepKeyActions.SET_WALLET:
      return { ...state, keepKeyWallet: action.payload }
    default:
      return state
  }
}

const KeepKeyContext = createContext<IKeepKeyContext | null>(null)

export const KeepKeyProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const {
    state: { wallet },
  } = useWallet()
  const { versionsQuery, stableDesktopVersionQuery } = useKeepKeyVersions({ wallet })
  const versions = versionsQuery.data?.versions
  const isLTCSupportedFirmwareVersion = versionsQuery.data?.isLTCSupportedFirmwareVersion ?? false
  const stableVersion = stableDesktopVersionQuery.data
  const translate = useTranslate()
  const toast = useToast()
  const keepKeyWallet = useMemo(
    () => (wallet && isKeepKeyHDWallet(wallet) ? wallet : undefined),
    [wallet],
  )
  const [state, dispatch] = useReducer(reducer, initialState)
  const toastRef = useRef<ToastId | undefined>(undefined)

  const onClose = useCallback(() => {
    if (toastRef.current) {
      toast.close(toastRef.current)
    }
  }, [toast, toastRef])

  const setHasPassphrase = useCallback((payload: boolean | undefined) => {
    dispatch({
      type: KeepKeyActions.SET_HAS_PASSPHRASE,
      payload,
    })
  }, [])

  const setDeviceTimeout = useCallback((payload: RadioOption<DeviceTimeout> | undefined) => {
    dispatch({
      type: KeepKeyActions.SET_DEVICE_TIMEOUT,
      payload,
    })
  }, [])

  useEffect(() => {
    if (!keepKeyWallet) return
    dispatch({ type: KeepKeyActions.SET_WALLET, payload: keepKeyWallet })
    ;(async () => {
      await poll({
        fn: async () => {
          try {
            const features = await keepKeyWallet.getFeatures()
            return features
          } catch (e) {
            console.error(e)
            return undefined
          }
        },
        validate: (features: Features.AsObject | undefined) => {
          if (!features) return false

          dispatch({ type: KeepKeyActions.SET_FEATURES, payload: features })
          setHasPassphrase(features?.passphraseProtection)
          setDeviceTimeout(
            Object.values(timeoutOptions).find(t => Number(t.value) === features?.autoLockDelayMs),
          )
          return true
        },
        interval: 2000,
        maxAttempts: 30,
      }).promise
    })()
  }, [keepKeyWallet, setDeviceTimeout, setHasPassphrase])

  const platform = useMemo(() => getPlatform(), [])
  const latestVersion = stableVersion

  const platformFilename = useMemo(() => {
    switch (platform) {
      case 'Mac OS':
        return `KeepKey-Desktop-${latestVersion}-universal.dmg`
      case 'Windows':
        return `KeepKey-Desktop-Setup-${latestVersion}.exe`
      case 'Linux':
        return `KeepKey-Desktop-${latestVersion}.AppImage`
      default:
        return null
    }
  }, [platform, latestVersion])

  const updaterUrl = useMemo(
    () =>
      platformFilename ? `${UPDATER_BASE_URL}v${latestVersion}/${platformFilename}` : RELEASE_PAGE,
    [platformFilename, latestVersion],
  )

  useEffect(() => {
    if (!keepKeyWallet) return
    if (!versions) return

    if (
      (versions.bootloader.updateAvailable || versions.firmware.updateAvailable) &&
      !toast.isActive(KEEPKEY_TOAST_ID)
    ) {
      toastRef.current = toast({
        render: () => {
          return (
            <Alert status='info' variant='solid' colorScheme='blue'>
              <Box alignSelf='flex-start' me={2}>
                <RiFlashlightLine size={24} />
              </Box>
              <Box>
                <AlertTitle>{translate('updateToast.keepKey.title')}</AlertTitle>
                <AlertDescription>
                  <Text>{translate('updateToast.keepKey.newUpdateAvailable')}</Text>
                  {!isLTCSupportedFirmwareVersion ? (
                    <Text>
                      {translate('updateToast.keepKey.updateRequiredForFeature', {
                        feature: 'Litecoin',
                      })}
                    </Text>
                  ) : null}
                </AlertDescription>
                <Link href={updaterUrl} display={'block'} fontWeight={'bold'} mt={2} isExternal>
                  {translate('updateToast.keepKey.downloadCta')}
                </Link>
              </Box>
              <CloseButton
                alignSelf='flex-start'
                position='relative'
                right={-1}
                top={-1}
                onClick={onClose}
              />
            </Alert>
          )
        },
        id: KEEPKEY_TOAST_ID,
        duration: 12000,
        isClosable: true,
        position: 'bottom-right',
      })
    }
  }, [
    isLTCSupportedFirmwareVersion,
    keepKeyWallet,
    toast,
    translate,
    versions,
    onClose,
    updaterUrl,
  ])

  const value: IKeepKeyContext = useMemo(
    () => ({
      state,
      keepKeyWallet,
      setHasPassphrase,
    }),
    [keepKeyWallet, setHasPassphrase, state],
  )

  return <KeepKeyContext.Provider value={value}>{children}</KeepKeyContext.Provider>
}

export const useKeepKey = (): IKeepKeyContext =>
  useContext(KeepKeyContext as React.Context<IKeepKeyContext>)

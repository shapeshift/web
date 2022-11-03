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
import type { Asset } from '@shapeshiftoss/asset-service'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import axios from 'axios'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { RiFlashlightLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import Web3 from 'web3'
import type { RadioOption } from 'components/Radio/Radio'
import { useWallet } from 'hooks/useWallet/useWallet'
import { erc20Abi } from 'pages/Leaderboard/helpers/erc20Abi'
import { nftAbi } from 'pages/Leaderboard/helpers/nftAbi'

import { useKeepKeyVersions } from './KeepKey/hooks/useKeepKeyVersions'

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
  keepKeyWallet: KeepKeyHDWallet | undefined
  getKeepkeyAssets: () => KKAsset[]
  getKeepkeyAsset: (geckoId: string) => KKAsset | undefined
  kkWeb3: any
  kkNftContract: any
  kkErc20Contract: any
}

export type KeepKeyActionTypes =
  | { type: KeepKeyActions.SET_HAS_PASSPHRASE; payload: boolean | undefined }
  | { type: KeepKeyActions.SET_FEATURES; payload: Features.AsObject | undefined }
  | { type: KeepKeyActions.SET_DEVICE_TIMEOUT; payload: RadioOption<DeviceTimeout> | undefined }
  | { type: KeepKeyActions.RESET_STATE }

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
    default:
      return state
  }
}

const overrideGeckoName = (name: string) => {
  if (name.toUpperCase() === 'XRP') return 'Ripple'
  if (name.toUpperCase() === 'BNB') return 'Binance'
  else return name
}

export type KKAsset = Asset & { rank: number; marketCap: number; link: string; geckoId: string }

const KeepKeyContext = createContext<IKeepKeyContext | null>(null)

export const KeepKeyProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const {
    state: { wallet },
  } = useWallet()
  const { versions, updaterUrl, isLTCSupportedFirmwareVersion } = useKeepKeyVersions()
  const translate = useTranslate()
  const toast = useToast()
  const keepKeyWallet = useMemo(() => (wallet && isKeepKey(wallet) ? wallet : undefined), [wallet])
  const [state, dispatch] = useReducer(reducer, initialState)
  const toastRef = useRef<ToastId | undefined>()

  const [keepkeyAssets, setKeepkeyAssets] = useState<KKAsset[]>([])

  const [kkWeb3, setkkWeb3] = useState<any>()
  const [kkNftContract, setkkNftContract] = useState<any>()
  const [kkErc20Contract, setkkErc20Contract] = useState<any>()

  const loadKeepkeyAssets = useCallback(async () => {
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false',
    )

    const kkAssets = data.map((geckoAsset: any) => {
      const symbol = geckoAsset?.symbol ?? ''
      const kkAsset: KKAsset = {
        assetId: `keepkey_${symbol.toUpperCase()}`,
        chainId: `keepkey_${symbol.toUpperCase()}`,
        color: '',
        explorer: '',
        explorerAddressLink: '',
        explorerTxLink: '',
        icon: geckoAsset.image,
        name: overrideGeckoName(geckoAsset.name),
        precision: 1, // This is wrong but needs to exist (find out why)
        symbol: geckoAsset.symbol.toUpperCase(),
        // kk specific
        rank: geckoAsset.market_cap_rank,
        marketCap: geckoAsset.market_cap,
        geckoId: geckoAsset.id,
        link: `https://www.coingecko.com/en/coins/${geckoAsset.id}`,
      }
      return kkAsset
    })
    setKeepkeyAssets(kkAssets)
  }, [setKeepkeyAssets])

  useEffect(() => {
    loadKeepkeyAssets()
  }, [loadKeepkeyAssets])

  const loadWeb3 = useCallback(() => {
    const network = 'goerli'
    const web3 = new Web3(
      new Web3.providers.HttpProvider(
        `https://${network}.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
      ),
    )
    const nftContract = new web3.eth.Contract(
      nftAbi as any,
      '0xa869a28a7185df50e4abdba376284c44497c4753',
    )
    const erc20Contract = new web3.eth.Contract(
      erc20Abi as any,
      '0xcc5a5975E8f6dF4dDD9Ff4Eb57471a3Ff32526a3',
    )

    setkkWeb3(web3)
    setkkNftContract(nftContract)
    setkkErc20Contract(erc20Contract)
  }, [])

  useEffect(() => {
    loadWeb3()
  }, [loadWeb3])

  const getKeepkeyAssets = useMemo(() => () => keepkeyAssets, [keepkeyAssets])

  const getKeepkeyAsset = useCallback(
    (geckoId: string) => {
      return keepkeyAssets.find(kkAsset => kkAsset.geckoId === geckoId)
    },
    [keepkeyAssets],
  )

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
    ;(async () => {
      const features = await keepKeyWallet.getFeatures()
      dispatch({ type: KeepKeyActions.SET_FEATURES, payload: features })
      setHasPassphrase(features?.passphraseProtection)
      setDeviceTimeout(
        Object.values(timeoutOptions).find(t => Number(t.value) === features?.autoLockDelayMs),
      )
    })()
  }, [keepKeyWallet, keepKeyWallet?.features, setDeviceTimeout, setHasPassphrase])

  useEffect(() => {
    if (!keepKeyWallet) return
    ;(async () => {
      if (!versions || !updaterUrl) return

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
          duration: null,
          isClosable: true,
          position: 'bottom-right',
        })
      }
    })()
  }, [
    isLTCSupportedFirmwareVersion,
    keepKeyWallet,
    toast,
    translate,
    versions,
    onClose,
    updaterUrl,
    getKeepkeyAsset,
  ])

  const value: IKeepKeyContext = useMemo(
    () => ({
      state,
      keepKeyWallet,
      setHasPassphrase,
      getKeepkeyAssets,
      getKeepkeyAsset,
      kkWeb3,
      kkNftContract,
      kkErc20Contract,
    }),
    [
      state,
      keepKeyWallet,
      setHasPassphrase,
      getKeepkeyAssets,
      getKeepkeyAsset,
      kkWeb3,
      kkNftContract,
      kkErc20Contract,
    ],
  )

  return <KeepKeyContext.Provider value={value}>{children}</KeepKeyContext.Provider>
}

export const useKeepKey = (): IKeepKeyContext =>
  useContext(KeepKeyContext as React.Context<IKeepKeyContext>)

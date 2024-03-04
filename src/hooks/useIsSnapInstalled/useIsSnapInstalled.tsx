import detectEthereumProvider from '@metamask/detect-provider'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import type { Eip1193Provider } from 'ethers'
import pDebounce from 'p-debounce'
import pMemoize from 'p-memoize'
import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

const POLL_INTERVAL = 3000 // tune me to make this "feel" right
const snapId = getConfig().REACT_APP_SNAP_ID

// Many many user-agents to detect mobile MM and other in-app dApp browsers
// https://github.com/MetaMask/metamask-mobile/issues/3920#issuecomment-1074188335
const isBrowser = typeof window !== 'undefined'
const hasEthereum = isBrowser && window.ethereum !== undefined
const isAndroid = /(Android)/i.test(window.navigator.userAgent ?? '')
const isIOS = /(iPhone|iPod|iPad)/i.test(window.navigator.userAgent ?? '')
const isMobile = isIOS || isAndroid
// Is a mobile browser and has injected window.ethereum - we assume in-app dApp browser
export const isMetamaskMobileWebView = isMobile && hasEthereum

// https://github.com/wevm/wagmi/blob/21245be51d7c6dff1c7b285226d0c89c4a9d8cac/packages/connectors/src/utils/getInjectedName.ts#L6-L56
// This will need to be kept up-to-date with the latest list of impersonators
const METAMASK_IMPERSONATORS = [
  'isBraveWallet',
  'isTokenary',
  'isFrame',
  'isLiquality',
  'isOpera',
  'isTally',
  'isStatus',
  'isXDEFI',
  'isNifty',
  'isRonin',
  'isBinance',
  'isCoinbase',
  'isExodus',
  'isPhantom',
  'isGlow',
  'isOneInch',
  'isRabby',
  'isTrezor',
  'isLedger',
  'isKeystone',
  'isBitBox',
  'isGridPlus',
  'isJade',
  'isPortis',
  'isFortmatic',
  'isTorus',
  'isAuthereum',
  'isWalletLink',
  'isWalletConnect',
  'isDapper',
  'isBitski',
  'isVenly',
  'isSequence',
  'isGamestop',
  'isZerion',
  'isDeBank',
  'isKukai',
  'isTemple',
  'isSpire',
  'isWallet',
  'isCore',
  'isAnchor',
  'isWombat',
  'isMathWallet',
  'isMeetone',
  'isHyperPay',
  'isTokenPocket',
  'isBitpie',
  'isAToken',
  'isOwnbit',
  'isHbWallet',
  'isMYKEY',
  'isHuobiWallet',
  'isEidoo',
  'isTrust',
  'isImToken',
  'isONTO',
  'isSafePal',
  'isCoin98',
  'isVision',
]

export const checkIsSnapInstalled = pDebounce.promise(
  (): Promise<boolean | null> => shapeShiftSnapInstalled(snapId),
)

export const checkIsMetaMask = pMemoize(
  async (wallet: HDWallet | null): Promise<boolean> => {
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
    // We don't want to run this hook altogether if using any wallet other than MM
    if (!isMetaMaskMultichainWallet) return false

    const provider = (await detectEthereumProvider()) as Eip1193Provider
    // MetaMask impersonators don't support the methods we need to check for snap installation, and will throw
    // `as any` because isMetaMask is gone from the providers in ethers v6
    if (!(provider as any).isMetaMask) return false

    return true
  },
  {
    cacheKey: ([_wallet]) => (_wallet as MetaMaskShapeShiftMultiChainHDWallet | null)?._isMetaMask,
  },
)

export const checkIsMetaMaskImpersonator = pMemoize(
  async (wallet: HDWallet | null): Promise<boolean> => {
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
    // We don't want to run this hook altogether if using any wallet other than MM
    if (!isMetaMaskMultichainWallet) return false

    const provider = (await detectEthereumProvider()) as Eip1193Provider
    // Some impersonators really like to make it difficult for us to detect *actual* MetaMask
    // Note, checking for the truthiness of the value isn't enough - some impersonators have the key present but undefined
    // This is weird, but welcome to the world of web3
    return METAMASK_IMPERSONATORS.some(impersonator => impersonator in provider)
  },
  {
    cacheKey: ([_wallet]) => (_wallet as MetaMaskShapeShiftMultiChainHDWallet | null)?._isMetaMask,
  },
)

export const useIsSnapInstalled = (): null | boolean => {
  const [isSnapInstalled, setIsSnapInstalled] = useState<null | boolean>(null)

  const {
    state: { wallet, isConnected, isDemoWallet },
  } = useWallet()

  const checkSnapInstallation = useCallback(async () => {
    if (!isConnected || isDemoWallet) return
    const isMetaMask = await checkIsMetaMask(wallet)
    const isMetaMaskImpersonator = await checkIsMetaMaskImpersonator(wallet)
    if (isMetaMaskImpersonator) return
    if (!isMetaMask) return

    const _isSnapInstalled = await checkIsSnapInstalled()
    setIsSnapInstalled(_isSnapInstalled)
  }, [isConnected, isDemoWallet, wallet])

  useEffect(() => {
    // Call the function immediately
    checkSnapInstallation()

    // Set up a polling interval
    const intervalId = setInterval(checkSnapInstallation, POLL_INTERVAL)

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, [checkSnapInstallation, wallet])

  return isSnapInstalled
}

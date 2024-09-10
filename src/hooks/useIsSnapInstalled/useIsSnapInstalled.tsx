import detectEthereumProvider from '@metamask/detect-provider'
import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import type { Eip1193Provider } from 'ethers'
import pDebounce from 'p-debounce'
import pMemoize from 'p-memoize'
import { useCallback, useEffect, useState } from 'react'
import { getSnapVersion } from 'utils/snaps'
import { useWallet } from 'hooks/useWallet/useWallet'

const POLL_INTERVAL = 3000 // tune me to make this "feel" right
const snapId = getConfig().REACT_APP_SNAP_ID

// Many many user-agents to detect mobile MM and other in-app dApp browsers
// https://github.com/MetaMask/metamask-mobile/issues/3920#issuecomment-1074188335
const isBrowser = () => typeof window !== 'undefined'
// Is a browser and has MetaMaskMobile user-agent
export const checkIsMetaMaskMobileWebView = () =>
  isBrowser() && /(MetaMaskMobile)/i.test(window.navigator.userAgent ?? '')

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

export const checkIsMetaMaskDesktop = pMemoize(
  async (wallet: HDWallet | null): Promise<boolean> => {
    const isMetaMaskMobileWebView = checkIsMetaMaskMobileWebView()
    if (isMetaMaskMobileWebView) return false
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

export const useIsSnapInstalled = (): {
  isSnapInstalled: boolean | null
  isCorrectVersion: boolean | null
} => {
  const [isSnapInstalled, setIsSnapInstalled] = useState<null | boolean>(null)
  const [isCorrectVersion, setIsCorrectVersion] = useState<boolean | null>(null)

  const {
    state: { wallet, isConnected, isDemoWallet },
  } = useWallet()

  const checkSnapInstallation = useCallback(async () => {
    if (!isConnected || isDemoWallet) return
    const isMetaMaskDesktop = await checkIsMetaMaskDesktop(wallet)
    const isMetaMaskImpersonator = await checkIsMetaMaskImpersonator(wallet)
    if (isMetaMaskImpersonator) return
    if (!isMetaMaskDesktop) return

    const version = await getSnapVersion()
    const _isSnapInstalled = await checkIsSnapInstalled()
    // TODO(gomes): no magic strings in the house
    setIsCorrectVersion(version === '1.0.10')
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

  return { isSnapInstalled, isCorrectVersion }
}

export const canAddMetaMaskAccount = ({
  accountNumber,
  chainId,
  wallet,
  isSnapInstalled,
}: {
  accountNumber: number
  chainId: ChainId
  wallet: HDWallet
  isSnapInstalled: boolean
}) => {
  const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet

  if (!isMetaMaskMultichainWallet)
    throw new Error(
      'canAddMetaMaskAccount should only be called in the context of a MetaMask adapter',
    )

  // Can always add 0th account regardless of chain/snap installation
  if (accountNumber === 0) return true

  // MM without snaps never support multi-account, regardless of chain
  if (!isSnapInstalled) return false

  // MM doesn't support multi-account for EVM chains, regardless of snap installation
  // since EVM chains in MM use MetaMask's native JSON-RPC functionality which doesn't support multi-account
  // Trying to derive an account 0+ will always return the 0th account
  if (isEvmChainId(chainId)) return false

  if (
    // Cosmos SDK chains account derivation > 0 is rugged for snaps and always return the 0th account, similar to the rug for EVM chains above
    fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk
  )
    return false

  // This is a non-Cosmos SDK, non-EVM account 0+ with snaps installed, we can add this account
  return true
}

import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import pDebounce from 'p-debounce'
import { useCallback, useEffect, useState } from 'react'
import { getSnapVersion } from 'utils/snaps'
import { useWallet } from 'hooks/useWallet/useWallet'

const POLL_INTERVAL = 3000 // tune me to make this "feel" right
const snapId = getConfig().REACT_APP_SNAP_ID
const snapVersion = getConfig().REACT_APP_SNAP_VERSION

// Many many user-agents to detect mobile MM and other in-app dApp browsers
// https://github.com/MetaMask/metamask-mobile/issues/3920#issuecomment-1074188335
const isBrowser = () => typeof window !== 'undefined'
// Is a browser and has MetaMaskMobile user-agent
export const checkIsMetaMaskMobileWebView = () =>
  isBrowser() && /(MetaMaskMobile)/i.test(window.navigator.userAgent ?? '')

export const checkIsSnapInstalled = pDebounce.promise(
  (): Promise<boolean | null> => shapeShiftSnapInstalled(snapId),
)

export const checkIsMetaMaskDesktop = (wallet: HDWallet | null): boolean => {
  const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet
  // We don't want to run this hook altogether if using any wallet other than MM
  if (!isMetaMaskMultichainWallet) return false
  if (wallet.providerRdns !== 'io.metamask') return false
  const isMetaMaskMobileWebView = checkIsMetaMaskMobileWebView()
  if (isMetaMaskMobileWebView) return false

  return true
}

export const checkIsMetaMaskImpersonator = (wallet: HDWallet | null): boolean => {
  const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet
  // We don't want to run this hook altogether if using any wallet other than MM
  if (!isMetaMaskMultichainWallet) return false

  return wallet.providerRdns !== 'io.metamask'
}

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
    const isMetaMaskDesktop = checkIsMetaMaskDesktop(wallet)
    const isMetaMaskImpersonator = checkIsMetaMaskImpersonator(wallet)
    if (isMetaMaskImpersonator) return
    if (!isMetaMaskDesktop) return

    const version = await getSnapVersion()
    const _isSnapInstalled = await checkIsSnapInstalled()

    setIsCorrectVersion(version === snapVersion)
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
  const isMetaMaskMultichainHdWallet = wallet instanceof MetaMaskMultiChainHDWallet

  if (!isMetaMaskMultichainHdWallet)
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

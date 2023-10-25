import detectEthereumProvider from '@metamask/detect-provider'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import type { providers } from 'ethers'
import pDebounce from 'p-debounce'
import pMemoize from 'p-memoize'
import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

const POLL_INTERVAL = 3000 // tune me to make this "feel" right
const snapId = getConfig().REACT_APP_SNAP_ID

export const checkIsSnapInstalled = pDebounce.promise(
  (): Promise<boolean | null> => shapeShiftSnapInstalled(snapId),
)

export const checkIsMetaMask = pMemoize(
  async (wallet: HDWallet | null): Promise<boolean> => {
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
    // We don't want to run this hook altogether if using any wallet other than MM
    if (!isMetaMaskMultichainWallet) return false

    const provider = (await detectEthereumProvider()) as providers.ExternalProvider
    // MetaMask impersonators don't support the methods we need to check for snap installation, and will throw
    if (!provider.isMetaMask) return false
    // Some impersonators really like to make it difficult for us to detect *actual* MetaMask
    if ((provider as any).isBraveWallet) return false

    return true
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

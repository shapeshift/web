import detectEthereumProvider from '@metamask/detect-provider'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import type { providers } from 'ethers'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

export const useIsSnapInstalled = (): null | boolean => {
  const [isSnapInstalled, setIsSnapInstalled] = useState<null | boolean>(null)
  const POLL_INTERVAL = 3000 // tune me to make this "feel" right

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
    // We don't want to run this hook altogether if using any wallet other than MM
    if (!isMetaMaskMultichainWallet) return
    const snapId = getConfig().REACT_APP_SNAP_ID

    const checkSnapInstallation = async () => {
      const provider = (await detectEthereumProvider()) as providers.ExternalProvider
      // MetaMask impersonators don't support the methods we need to check for snap installation, and will throw
      if (!provider.isMetaMask) return
      const snapIsInstalled = await shapeShiftSnapInstalled(snapId)
      setIsSnapInstalled(snapIsInstalled)
    }

    // Call the function immediately
    checkSnapInstallation()

    // Set up a polling interval
    const intervalId = setInterval(checkSnapInstallation, POLL_INTERVAL)

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, [wallet])

  return isSnapInstalled
}

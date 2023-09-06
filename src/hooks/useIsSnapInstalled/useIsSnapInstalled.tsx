import {
  metaMaskFlaskSupported,
  shapeShiftSnapInstalled,
} from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { getLocalWalletType } from 'context/WalletProvider/local-wallet'
import { useModal } from 'hooks/useModal/useModal'
import { store } from 'state/store'

export const useIsSnapInstalled = (): null | boolean => {
  const [isSnapInstalled, setIsSnapInstalled] = useState<null | boolean>(null)
  const POLL_INTERVAL = 3000 // tune me to make this "feel" right

  const snaps = useModal('snaps')

  useEffect(() => {
    ;(async () => {
      const showSnapsModal = store.getState().preferences.showSnapsModal
      if (!showSnapsModal) return

      const localWalletType = getLocalWalletType()
      if (localWalletType !== KeyManager.MetaMask) return

      const isSnapsEnabled = getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS
      if (!isSnapsEnabled) return

      // TODO(gomes): When snaps are released in prod MM build, we shouldn't check for Flask anymore
      const isMetamaskFlask = await metaMaskFlaskSupported()
      if (!isMetamaskFlask) return

      if (snaps.isOpen) return

      snaps.open({})
    })()
  }, [snaps, isSnapInstalled])

  useEffect(() => {
    const snapId = getConfig().REACT_APP_SNAP_ID

    const checkSnapInstallation = async () => {
      const snapIsInstalled = await shapeShiftSnapInstalled(snapId)
      setIsSnapInstalled(snapIsInstalled)
    }

    // Call the function immediately
    checkSnapInstallation()

    // Set up a polling interval
    const intervalId = setInterval(checkSnapInstallation, POLL_INTERVAL)

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, [])

  return isSnapInstalled
}

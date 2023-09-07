import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'

export const useIsSnapInstalled = (): null | boolean => {
  const [isSnapInstalled, setIsSnapInstalled] = useState<null | boolean>(null)
  const POLL_INTERVAL = 3000 // tune me to make this "feel" right

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

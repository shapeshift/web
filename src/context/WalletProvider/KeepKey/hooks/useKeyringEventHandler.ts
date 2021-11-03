import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { useEffect } from 'react'

interface KeyringState {
  keyring: Keyring
}

export const useKeyringEventHandler = (
  state: KeyringState /*, dispatch: Dispatch<ActionTypes>*/
) => {
  const { keyring } = state

  useEffect(() => {
    const handleEvent = (event: string | string[], ...values: any[]) => {
      /*
       Log out all events so we can use the logs for reference for handling other Keyring events
       */
      console.info('All Event Handler:', { event, values })
    }

    // Handle all KeepKey events
    keyring.onAny(handleEvent)

    return () => {
      keyring.offAny(handleEvent)
    }
  }, [keyring])
}

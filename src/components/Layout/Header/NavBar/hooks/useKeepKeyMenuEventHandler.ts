import { useState } from 'react'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'
import { MessageType } from 'context/WalletProvider/KeepKey/KeepKeyTypes'

export const useKeepKeyMenuEventHandler = () => {
  const { keyring } = useKeepKeyWallet()

  const [awaitingButtonPress, setAwaitingButtonPress] = useState(false)
  const [keepKeyUpdateStatus, setKeepKeyUpdateStatus] = useState<
    'success' | 'failure' | undefined
  >()

  const handleKeepKeyEvents = () => {
    keyring.on(['KeepKey', '*', MessageType.PINMATRIXREQUEST.toString()], () =>
      setAwaitingButtonPress(false)
    )

    keyring.on(['KeepKey', '*', MessageType.SUCCESS.toString()], () =>
      setKeepKeyUpdateStatus('success')
    )
    keyring.on(['KeepKey', '*', MessageType.FAILURE.toString()], () =>
      setKeepKeyUpdateStatus('failure')
    )
  }

  return { awaitingButtonPress, setAwaitingButtonPress, keepKeyUpdateStatus, handleKeepKeyEvents }
}

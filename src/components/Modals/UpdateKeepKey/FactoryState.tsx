import { Button, ModalBody } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const KeepKeyFactoryState = () => {
  const [loading, setLoading] = useState(false)
  const {
    dispatch,
    setDeviceState,
    state: { deviceId },
  } = useWallet()
  const { updateKeepKey } = useModal()

  useEffect(() => {
    setDeviceState({ disposition: undefined })
  }, [setDeviceState])

  const handleCreateWalletPress = async () => {
    setLoading(true)
    setDeviceState({ disposition: 'initializing' })
    dispatch({
      type: WalletActions.OPEN_KEEPKEY_LABEL,
      payload: {
        deviceId,
      },
    })
    updateKeepKey.close()
  }

  const handleRecoverWalletPress = async () => {
    setLoading(true)
    setDeviceState({ disposition: 'recovering' })
    dispatch({
      type: WalletActions.OPEN_KEEPKEY_RECOVERY_SETTINGS,
      payload: {
        deviceId,
      },
    })
    updateKeepKey.close()
  }

  return (
    <>
      <ModalBody pt={5}>
        <Text color='gray.500' translation={'modals.keepKey.factoryState.body'} mb={4} />
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          onClick={handleCreateWalletPress}
          disabled={loading}
          mb={3}
        >
          <Text translation={'modals.keepKey.factoryState.createButton'} />
        </Button>
        <Button
          width='full'
          size='lg'
          onClick={handleRecoverWalletPress}
          disabled={loading}
          variant='outline'
          border='none'
        >
          <Text translation={'modals.keepKey.factoryState.recoverButton'} />
        </Button>
      </ModalBody>
    </>
  )
}

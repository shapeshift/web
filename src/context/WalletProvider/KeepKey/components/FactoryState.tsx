import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, Flex, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Text } from '@/components/Text'
import { KeepKeyRoutes } from '@/context/WalletProvider/routes'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const KeepKeyFactoryState = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setDeviceState } = useWallet()

  useEffect(() => {
    setDeviceState({ disposition: undefined })
  }, [setDeviceState])

  const handleCreateWalletPress = useCallback(() => {
    setLoading(true)
    setDeviceState({ disposition: 'initializing' })
    navigate(KeepKeyRoutes.NewLabel)
  }, [navigate, setDeviceState])

  const handleRecoverWalletPress = useCallback(() => {
    setLoading(true)
    setDeviceState({ disposition: 'recovering' })
    navigate(KeepKeyRoutes.RecoverySettings)
  }, [navigate, setDeviceState])

  return (
    <>
      <ModalHeader>
        <Flex alignItems='center'>
          <CheckCircleIcon color='green.400' mr={3} />
          <Text translation={'modals.keepKey.factoryState.header'} />
        </Flex>
      </ModalHeader>
      <ModalBody>
        <Text color='text.subtle' translation={'modals.keepKey.factoryState.body'} mb={4} />
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          onClick={handleCreateWalletPress}
          isDisabled={loading}
          mb={3}
        >
          <Text translation={'modals.keepKey.factoryState.createButton'} />
        </Button>
        <Button
          width='full'
          size='lg'
          onClick={handleRecoverWalletPress}
          isDisabled={loading}
          variant='outline'
          border='none'
        >
          <Text translation={'modals.keepKey.factoryState.recoverButton'} />
        </Button>
      </ModalBody>
    </>
  )
}

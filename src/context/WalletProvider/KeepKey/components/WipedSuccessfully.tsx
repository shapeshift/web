import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, Flex, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'

export const WipedSuccessfully = () => {
  const [loading, setLoading] = useState(false)
  const history = useHistory()

  const handleCreateWalletPress = async () => {
    setLoading(true)
    history.push(KeepKeyRoutes.NewLabel)
  }

  const handleRecoverWalletPress = async () => {
    setLoading(true)
    history.push(KeepKeyRoutes.NewLabel)
  }

  return (
    <>
      <ModalHeader>
        <Flex alignItems='center'>
          <CheckCircleIcon color='green.400' mr={3} />
          <Text translation={'modals.keepKey.wiped.header'} />
        </Flex>
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'modals.keepKey.wiped.body'} mb={4} />
        <Button
          isFullWidth
          size='lg'
          colorScheme='blue'
          onClick={handleCreateWalletPress}
          disabled={loading}
          mb={3}
        >
          <Text translation={'modals.keepKey.wiped.createButton'} />
        </Button>
        <Button
          isFullWidth
          size='lg'
          onClick={handleRecoverWalletPress}
          disabled={loading && true} // Un-disable when recover wallet is ready
          variant='outline'
          border='none'
          title='Coming soon...'
        >
          <Text translation={'modals.keepKey.wiped.recoverButton'} />
        </Button>
      </ModalBody>
    </>
  )
}

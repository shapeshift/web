import { NotAllowedIcon } from '@chakra-ui/icons'
import { Button, ModalBody } from '@chakra-ui/react'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'

export const KeepKeyRecoveryInvalid = () => {
  const history = useHistory()

  return (
    <>
      <ModalBody textAlign='center'>
        <NotAllowedIcon color='red.500' boxSize={20} mb={6} />
        <Text fontSize='lg' translation={'modals.keepKey.recoverySentence.invalid'} mb={4} />
        <Button
          isFullWidth
          colorScheme='blue'
          onClick={() => {
            history.push(KeepKeyRoutes.RecoverySentenceEntry)
          }}
        >
          <Text translation={'modals.keepKey.recoverySentence.tryAgain'} />
        </Button>
      </ModalBody>
    </>
  )
}

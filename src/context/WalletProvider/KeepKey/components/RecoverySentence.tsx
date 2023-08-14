import { Alert, AlertIcon, Flex, ModalBody, ModalHeader, useColorModeValue } from '@chakra-ui/react'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { Text } from 'components/Text'
import { useKeepKeyCancel } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyCancel'

export const KeepKeyRecoverySentence = () => {
  const handleCancel = useKeepKeyCancel()
  const yellowShade = useColorModeValue('yellow.500', 'yellow.200')

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.recoverySentence.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='text.subtle' translation={'modals.keepKey.recoverySentence.body'} mb={3} />
        <Alert status='warning' color={yellowShade} borderRadius='lg' mb={3}>
          <AlertIcon color={yellowShade} alignSelf='self-start' />
          <Flex direction='column'>
            <Text translation={'modals.keepKey.recoverySentence.infoFirst'} mb={3} />
            <Text translation={'modals.keepKey.recoverySentence.infoSecond'} />
          </Flex>
        </Alert>
      </ModalBody>
      <AwaitKeepKey
        onCancel={handleCancel}
        translation={'modals.keepKey.recoverySentence.awaitingButtonPress'}
        pl={6}
        pr={6}
      />
    </>
  )
}

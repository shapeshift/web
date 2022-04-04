import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, Flex, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'

export enum NewKeepKeyPath {
  WipeSuccessful = '/keepkey/new',
  Label = '/keepkey/label',
  Pin = '/keepkey/enter-pin',
  RecoverySentence = '/keepkey/recovery-sentence',
  InitializeSettingUp = '/keepkey/setting-up',
  InitializeComplete = '/keepkey/complete'
}

export const WipedSuccessfully = () => {
  const [loading, setLoading] = useState(false)
  const history = useHistory()

  const handleCreateWalletPress = async () => {
    setLoading(true)
    history.push(NewKeepKeyPath.Label)
  }

  const handleRecoverWalletPress = async () => {
    setLoading(true)
    history.push(NewKeepKeyPath.Label)
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
          disabled={loading}
          variant='outline'
          border='none'
        >
          <Text translation={'modals.keepKey.wiped.recoverButton'} />
        </Button>
      </ModalBody>
    </>
  )
}

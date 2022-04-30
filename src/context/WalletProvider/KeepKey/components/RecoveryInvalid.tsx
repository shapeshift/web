import { NotAllowedIcon } from '@chakra-ui/icons'
import { Button, ModalBody, useToast } from '@chakra-ui/react'
import { RecoverDevice } from '@shapeshiftoss/hdwallet-core'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

import { parseIntToEntropy } from './Label'

export const KeepKeyRecoveryInvalid = () => {
  const [loading, setLoading] = useState(false)
  const {
    setDeviceState,
    state: {
      deviceState: { recoverWithPassphrase, recoveryEntropy },
      wallet,
    },
  } = useWallet()
  const translate = useTranslate()
  const toast = useToast()

  const handleRetryPress = async () => {
    const label = await wallet?.getLabel()
    setLoading(true)
    setDeviceState({ awaitingDeviceInteraction: true })
    const recoverParams: RecoverDevice = {
      entropy: parseIntToEntropy(recoveryEntropy),
      label: label ?? '',
      passphrase: recoverWithPassphrase || false,
      pin: true,
      autoLockDelayMs: 600000, // Ten minutes
    }
    await wallet?.recover(recoverParams).catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }

  return (
    <>
      <ModalBody textAlign='center'>
        <NotAllowedIcon color='red.500' boxSize={20} mb={6} />
        <Text fontSize='lg' translation={'modals.keepKey.recoverySentence.invalid'} mb={4} />
        <Button isFullWidth colorScheme='blue' disabled={loading} onClick={handleRetryPress}>
          <Text translation={'modals.keepKey.recoverySentence.tryAgain'} />
        </Button>
      </ModalBody>
    </>
  )
}

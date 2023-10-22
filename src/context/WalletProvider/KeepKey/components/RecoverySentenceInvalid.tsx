import { WarningTwoIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

import { useKeepKeyRecover } from '../hooks/useKeepKeyRecover'

export const KeepKeyRecoverySentenceInvalid = () => {
  const [loading, setLoading] = useState(false)
  const {
    state: { wallet },
  } = useWallet()
  const recoverKeepKey = useKeepKeyRecover()

  const handleRetryClick = useCallback(async () => {
    const label = await wallet?.getLabel()
    setLoading(true)
    // Due to security/firmware limitations, we are not able to pass in the previously collected PIN,
    // we are forced to start the whole recover process again.
    await recoverKeepKey(label)
  }, [recoverKeepKey, wallet])

  return (
    <>
      <ModalHeader textAlign='center'>
        <Text translation={'modals.keepKey.recoveryInvalid.header'} />
      </ModalHeader>
      <ModalBody textAlign='center'>
        <WarningTwoIcon color='yellow.500' boxSize={20} mb={6} />
        <Text color='text.subtle' translation={'modals.keepKey.recoveryInvalid.body'} mb={4} />
        <Button width='full' colorScheme='blue' isDisabled={loading} onClick={handleRetryClick}>
          <Text translation={'modals.keepKey.recoveryInvalid.button'} />
        </Button>
      </ModalBody>
    </>
  )
}

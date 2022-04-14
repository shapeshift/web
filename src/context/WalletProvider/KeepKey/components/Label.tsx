import { Button, Input, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { RecoverDevice, ResetDevice } from '@shapeshiftoss/hdwallet-core'
import { useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

export const KeepKeyLabel = () => {
  const [loading, setLoading] = useState(false)
  const {
    setDeviceState,
    state: {
      deviceState: { disposition },
      wallet,
    },
  } = useWallet()
  const toast = useToast()
  const translate = useTranslate()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleInitializeSubmit = async () => {
    setLoading(true)
    const label = inputRef.current?.value
    const resetMessage: ResetDevice = { label: label ?? '', pin: true }
    setDeviceState({ awaitingDeviceInteraction: true })
    await wallet?.reset(resetMessage).catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }

  const handleRecoverSubmit = async () => {
    setLoading(true)
    const label = inputRef.current?.value
    setDeviceState({ stagedLabel: label })
    const recoverParams: RecoverDevice = {
      entropy: 128,
      label: label ?? '',
      passphrase: false,
      pin: true,
      autoLockDelayMs: 600000,
      u2fCounter: Math.floor(+new Date() / 1000),
    }
    wallet?.recover(recoverParams)
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.label.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'modals.keepKey.label.body'} mb={4} />
        <Input type='text' ref={inputRef} size='lg' variant='filled' mt={3} mb={6} />
        <Button
          isFullWidth
          size='lg'
          colorScheme='blue'
          onClick={disposition === 'initializing' ? handleInitializeSubmit : handleRecoverSubmit}
          disabled={loading}
          mb={3}
        >
          <Text translation={'modals.keepKey.label.button'} />
        </Button>
      </ModalBody>
    </>
  )
}

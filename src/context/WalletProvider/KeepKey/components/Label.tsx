import { Button, Input, ModalBody, ModalHeader, useToast } from '@chakra-ui/react'
import type { ResetDevice } from '@shapeshiftoss/hdwallet-core'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

import { useKeepKeyRecover } from '../hooks/useKeepKeyRecover'

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
  const [label, setLabel] = useState('')
  const recoverKeepKey = useKeepKeyRecover()

  const handleInitializeSubmit = async () => {
    setLoading(true)
    const resetMessage: ResetDevice = { label: label ?? '', pin: true }
    setDeviceState({ awaitingDeviceInteraction: true })
    await wallet?.reset(resetMessage).catch(async e => {
      console.error(e)
      await wallet?.cancel()
      toast({
        title: translate('common.error'),
        description: e?.message?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }

  const handleRecoverSubmit = async () => {
    setLoading(true)
    await recoverKeepKey(label)
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.label.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='text.subtle' translation={'modals.keepKey.label.body'} mb={4} />
        <Input
          type='text'
          value={label}
          placeholder={translate('modals.keepKey.label.placeholder')}
          onChange={e => setLabel(e.target.value)}
          size='lg'
          variant='filled'
          mt={3}
          mb={6}
        />
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          onClick={disposition === 'initializing' ? handleInitializeSubmit : handleRecoverSubmit}
          isDisabled={loading}
          mb={3}
        >
          <Text
            translation={
              label ? 'modals.keepKey.label.setLabelButton' : 'modals.keepKey.label.skipLabelButton'
            }
          />
        </Button>
      </ModalBody>
    </>
  )
}

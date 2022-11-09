import { Button, Input, ModalBody, ModalHeader } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import type { ResetDevice } from '@shapeshiftoss/hdwallet-core'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { useKeepKeyRecover } from '../hooks/useKeepKeyRecover'
const moduleLogger = logger.child({ namespace: ['Label'] })

export const KeepKeyLabel = () => {
  const [loading, setLoading] = useState(true)
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
    setDeviceState({ awaitingDeviceInteraction: true, disposition })
    await wallet?.reset(resetMessage).catch(e => {
      setLoading(false)
      setDeviceState({ awaitingDeviceInteraction: false, disposition })
      moduleLogger.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }

  useEffect(() => {
    // Label screen hangs if you click skip too quickly
    // Hack to keep that from happening
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }, [])

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
        <Text color='gray.500' translation={'modals.keepKey.label.body'} mb={4} />
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
          disabled={loading}
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

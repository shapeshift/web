import {
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import KeepKeyConnect from 'assets/connect-keepkey.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { getAssetUrl } from '../../../lib/getAssetUrl'

export const HardwareErrorModal = () => {
  const { hardwareError } = useModal()
  const { close, isOpen } = hardwareError

  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)

  useEffect(() => {
    getAssetUrl(KeepKeyConnect).then(setKKConnect)
  }, [])

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('@modal/close', {})
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalHeader>
          <Text translation={'modals.hardware.header'} />
        </ModalHeader>
        <ModalBody>
          <div>
            <Image src={kkConnect} alt='reconnect Device!' />
            <Text translation={'modals.hardware.reconnect'} />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

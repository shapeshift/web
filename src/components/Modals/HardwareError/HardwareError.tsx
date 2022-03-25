import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useEffect, useState } from 'react'
import KeepKeyConnect from 'assets/connect-keepkey.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { getAssetUrl } from '../../../lib/getAssetUrl'

export const HardwareErrorModal = (error: any) => {
  const { hardwareError } = useModal()
  const { close, isOpen } = hardwareError

  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)

  // let errorNoDevice = false
  // let errorReconnectDevice = false
  //
  // if(error.errorCode === 1){
  //   errorNoDevice = true
  // }}

  const HandleTroubleShoot = async () => {
    //
    close()
  }

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
        <ModalBody>
          {error.errorCode === 1 ? (
            <div>
              <ModalHeader>
                <Text translation={'modals.hardware.headerConnect'} />
              </ModalHeader>
              <Image src={kkConnect} alt='reconnect Device!' />
              <Text translation={'modals.hardware.reconnect'} />

              <Button isFullWidth size='lg' colorScheme='blue' onClick={HandleTroubleShoot}>
                <Text translation={'modals.hardware.troubleshoot'} />
              </Button>
            </div>
          ) : (
            <div>
              <ModalHeader>
                <Text translation={'modals.hardware.headerConnect'} />
              </ModalHeader>
              <Image src={kkConnect} alt='reconnect Device!' />
              <Text translation={'modals.hardware.connect'} />
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

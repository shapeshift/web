import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useEffect, useState } from 'react'
import KeepKeyConnect from 'assets/hold-and-connect.svg'
import KeepKeyRelease from 'assets/hold-and-release.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { getAssetUrl } from 'lib/getAssetUrl'

import { Row } from '../../Row/Row'

export const HardwareErrorModal = () => {
  const { keepkey } = useWallet()
  const [loading, setLoading] = useState(false)
  const { hardwareError } = useModal()
  const { close, isOpen } = hardwareError

  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)
  const [kkRelease, setKKRelease] = useState(KeepKeyRelease)

  useEffect(() => {
    getAssetUrl(KeepKeyConnect).then(setKKConnect)
    getAssetUrl(KeepKeyRelease).then(setKKRelease)
  }, [])

  const HandleUpdateFirmware = async () => {
    console.log("Updating firmware (firmware modal)")
    setLoading(true)
    ipcRenderer.send('@keepkey/update-firmware', {})
  }

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
            <Text translation={'modals.hardware.reconnect'} />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

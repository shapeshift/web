import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useState } from 'react'
import KeepKey from 'assets/hold-and-release.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { Row } from '../../Row/Row'

export const FirmwareModal = () => {
  const { keepkey } = useWallet()
  // const [error] = useState<string | null>(null)
  // const [loading] = useState(false)
  // const [show, setShow] = React.useState(false)
  // const [isApproved, setIsApproved] = React.useState(false)
  const { firmware } = useModal()
  const { close, isOpen } = firmware

  const HandleSubmit = async () => {
    close()
  }

  const HandleReject = async () => {
    close()
  }

  // @ts-ignore
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('onCloseModal', {})
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
          <Text translation={'modals.sign.header'} />
        </ModalHeader>
        <ModalBody>
          <div>
            <Row>
              <Row.Label>
                <Text translation={'modals.firmware.bootloader'} />
              </Row.Label>
              <Row.Value>{keepkey?.bootloaderVersion}</Row.Value>
            </Row>
            <Row>
              <Row.Label>
                <Text translation={'modals.firmware.firmware'} />
              </Row.Label>
              <Row.Value>{keepkey?.firmwareVersion}</Row.Value>
            </Row>
          </div>

        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

import {
  Button, Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay, Spinner,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useState } from 'react'
import KeepKeyRelease from 'assets/hold-and-release.svg'
import KeepKeyConnect from 'assets/hold-and-connect.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { Row } from '../../Row/Row'

export const BootloaderModal = () => {
  const { keepkey } = useWallet()
  // const [error] = useState<string | null>(null)
  // const [loading] = useState(false)
  // const [show, setShow] = React.useState(false)
  const [bootloaderMode, setBootloaderMode] = React.useState(false)
  const [loading, setLoading] = useState(false)
  // const [isApproved, setIsApproved] = React.useState(false)
  const { bootloader } = useModal()
  const { close, isOpen } = bootloader

  const HandleUpdateBootloader = async () => {
    setLoading(true)
    ipcRenderer.send('onUpdateBootloader', {})
  }
  const HandleUpdate = async () => {
    ipcRenderer.send('onUpdateKeepKeyStatus', {})
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
          <Text translation={'modals.firmware.bootloaderUpdate'} />
        </ModalHeader>
        <ModalBody>
          <div>
            {loading ? (
                <div>
                  <Spinner />
                </div>
            ) : (
                <div>
                {keepkey.isInUpdaterMode ? (<div>
                  <h2>Updating Bootloader</h2>
                  <small>click to perform action</small>
                  <Button
                      isFullWidth
                      size='lg'
                      colorScheme='blue'
                      onClick={HandleUpdateBootloader}
                      disabled={loading}
                  >
                    <Text translation={'modals.firmware.continue'} />
                  </Button>
                  <Image src={KeepKeyRelease} alt='Approve Transaction On Device!' />
                </div>) : (
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
                    <Image src={KeepKeyConnect} alt='Approve Transaction On Device!' />
                    <small>Please disconnect, hold down button, and reconnect device to enter bootloader mode to continue.</small>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

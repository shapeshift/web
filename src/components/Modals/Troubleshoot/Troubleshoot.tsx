import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import React, { useEffect } from 'react'
// import KeepKeyConnect from 'assets/connect-keepkey.svg'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export const TroubleshootModal = () => {
  const { troubleshoot } = useModal()
  const { close, isOpen } = troubleshoot
  // const [kkConnect, setKKConnect] = useState(KeepKeyConnect)

  const HandleTroubleShoot = async () => {
    close()
  }

  useEffect(() => {
    // getAssetUrl(KeepKeyConnect).then(setKKConnect)
  }, [])

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
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
          <ModalHeader>
            <Text translation={'modals.troubleshoot.header'} />
          </ModalHeader>
          <Button isFullWidth size='lg' colorScheme='blue' onClick={HandleTroubleShoot}>
            <Text translation={'modals.troubleshoot.button'} />
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

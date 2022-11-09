import {
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

import KeepKeyConnect from '../../../../assets/connect-keepkey.svg'
import { getAssetUrl } from '../../../../lib/getAssetUrl'

export const RequestBootloaderMode = () => {
  const { requestBootloaderMode } = useModal()
  const { close, isOpen } = requestBootloaderMode
  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)
  useEffect(() => {
    getAssetUrl(KeepKeyConnect).then(setKKConnect)
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
          <div>
            <ModalHeader>
              <Text translation='Restart KeepKey in update mode' />
              <Image src={kkConnect} alt='reconnect Device!' />
            </ModalHeader>
          </div>
          <div>
            <Text align='center' translation={'Restart device holding down button'} />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

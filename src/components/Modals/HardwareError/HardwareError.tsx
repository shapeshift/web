import {
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useHistory } from 'react-router'
import KeepKeyConnect from 'assets/connect-keepkey.svg'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

import { getAssetUrl } from '../../../lib/getAssetUrl'

export const HardwareErrorModal = (error: any) => {
  const { hardwareError } = useModal()
  const { close, isOpen } = hardwareError

  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)

  const history = useHistory()

  // let errorNoDevice = false
  // let errorReconnectDevice = false
  //
  // if(error.errorCode === 1){
  //   errorNoDevice = true
  // }}

  useEffect(() => {
    if (
      history.location.pathname === '/onboarding' ||
      history.location.pathname === '/#/onboarding'
    )
      close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.location.pathname])

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
                <Text translation='modals.keepKey.hardware.headerConnect' />
              </ModalHeader>
              <Image src={kkConnect} alt='reconnect Device!' />
              <Text translation={'modals.keepKey.hardware.reconnect'} />

              <Button size='lg' colorScheme='blue' onClick={HandleTroubleShoot}>
                <Text translation={'modals.keepKey.hardware.troubleshoot'} />
              </Button>
            </div>
          ) : (
            <div>
              <ModalHeader>
                <Text translation='modals.keepKey.hardware.headerConnect' />
              </ModalHeader>
              <Image src={kkConnect} alt='reconnect Device!' />
              <Text translation={'modals.keepKey.hardware.connect'} />
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

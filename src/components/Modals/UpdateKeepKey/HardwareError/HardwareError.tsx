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
import { useWallet } from 'hooks/useWallet/useWallet'

import { getAssetUrl } from '../../../../lib/getAssetUrl'

export const HardwareErrorModal = (error: any) => {
  const { hardwareError } = useModal()
  const { isUpdatingKeepkey } = useWallet()
  const { close, isOpen } = hardwareError

  const [kkConnect, setKKConnect] = useState(KeepKeyConnect)
  const history = useHistory()

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

  // const retryPair = useCallback(async () => {
  //   pairAndConnect.current()
  // }, [pairAndConnect])

  return (
    <Modal
      isOpen={isOpen && !isUpdatingKeepkey}
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
              {/*<Button isDisabled={deviceBusy} onClick={retryPair}>*/}
              {/*  {`${deviceBusy ? 'Retry (Device busy, please wait)' : 'Retry'}`}*/}
              {/*</Button>*/}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

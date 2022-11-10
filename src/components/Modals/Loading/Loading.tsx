import { Center, Modal, ModalContent, ModalOverlay, Spinner, Stack } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useHistory } from 'react-router'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const LoadingModal = ({ closing = false }: { closing: boolean }) => {
  const { loading } = useModal()
  const { close, isOpen } = loading
  const {
    state: { isConnected, isUpdatingKeepkey },
  } = useWallet()

  const history = useHistory()

  useEffect(() => {
    if (
      history.location.pathname === '/onboarding' ||
      history.location.pathname === '/#/onboarding'
    )
      close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.location.pathname])

  useEffect(() => {
    if ((isConnected || isUpdatingKeepkey) && isOpen && !closing) {
      close()
    }
  }, [close, closing, isConnected, isOpen, isUpdatingKeepkey])

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
      <ModalContent justifyContent='center' p={20}>
        <Center>
          <Stack alignContent='center'>
            <Spinner size='xl' alignSelf='center' />
            <RawText fontSize='xl' fontWeight='bold' color='gray.500' alignContent='center'>
              {closing ? 'Shutting Down...' : 'Connecting to KeepKey'}
            </RawText>
          </Stack>
        </Center>
      </ModalContent>
    </Modal>
  )
}

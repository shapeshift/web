import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import WidgetBot from '@widgetbot/react-embed'
import { useModal } from 'hooks/useModal/useModal'

const LiveSupport = () => {
  const { liveSupport } = useModal()
  const { close, isOpen } = liveSupport

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <WidgetBot
          server='554694662431178782' // ShapeShift's Discord
          channel='1055223821831000064' // #websupport Channel
          height={'80vh'}
        />
      </ModalContent>
    </Modal>
  )
}

export const LiveSupportModal = LiveSupport

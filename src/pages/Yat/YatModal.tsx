import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from 'hooks/useModal/useModal'

type YatModalProps = {
  eid: string
}

/**
 * see https://github.com/shapeshift/web/issues/4604
 * this modal is used to handle when a user successfully purchases a yat
 *
 * the app (including mobile app) will redirect to /yat?eid=<idOfPurchasedYat>
 */
export const YatModal: React.FC<YatModalProps> = ({ eid }) => {
  const { history, location } = useBrowserRouter()
  const { yat: yatModal } = useModal()
  const { close } = yatModal
  const isOpen = Boolean(eid)
  console.log('YatModal', { eid, isOpen })

  const handleClose = useCallback(() => {
    // remove the ?eid=<idOfPurchasedYat> query param from the route
    history.replace({ pathname: location.pathname })
    // close the modal
    close()
  }, [close, history, location.pathname])

  // TODO(0xdef1cafe): parse eid into emojis and display them

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>YatModal</ModalHeader>
        <ModalBody>
          <pre>{JSON.stringify({ eid }, null, 2)}</pre>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

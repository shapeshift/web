import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useMediaQuery,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { ManageHiddenAssetsList } from './ManageHiddenAssetsList'

import { useModal } from '@/hooks/useModal/useModal'
import { breakpoints } from '@/theme/theme'

export const ManageHiddenAssetsModal = () => {
  const translate = useTranslate()
  const manageHiddenAssets = useModal('manageHiddenAssets')
  const { close, isOpen } = manageHiddenAssets
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size={isLargerThanMd ? 'xl' : 'full'}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{translate('manageHiddenAssets.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <ManageHiddenAssetsList onClose={close} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

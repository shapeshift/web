import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { AnimatePresence } from 'framer-motion'
import { useModal } from 'hooks/useModal/useModal'

import type { FiatRampAsset } from './FiatRampsCommon'
import { Manager } from './views/Manager'

type FiatRampsModalProps = {
  asset?: FiatRampAsset
}

export const FiatRampsModal = ({ asset }: FiatRampsModalProps) => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered variant='fluid'>
      <ModalOverlay />

      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <AnimatePresence exitBeforeEnter initial={false}>
          <Manager asset={asset} />
        </AnimatePresence>
      </ModalContent>
    </Modal>
  )
}

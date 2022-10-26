import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { useMediaQuery } from '@chakra-ui/react'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import { Manager } from './views/Manager'

export const FiatRampsModal = () => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered={isLargerThanMd} variant='fluid'>
      <ModalOverlay />

      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <Manager />
      </ModalContent>
    </Modal>
  )
}

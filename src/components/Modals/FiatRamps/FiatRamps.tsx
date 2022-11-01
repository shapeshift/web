import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { useMediaQuery } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import type { FiatRampAction } from './FiatRampsCommon'
import { FiatManager } from './views/Manager'

type FiatRampsModalProps = {
  assetId?: AssetId
  fiatRampAction?: FiatRampAction
}

export const FiatRampsModal: React.FC<FiatRampsModalProps> = () => {
  const { fiatRamps } = useModal()
  const props = fiatRamps.props
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
        <FiatManager
          defaultFiatRampAction={props?.fiatRampAction}
          defaultAssetId={props?.assetId}
        />
      </ModalContent>
    </Modal>
  )
}

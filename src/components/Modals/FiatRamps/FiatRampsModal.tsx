import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useMediaQuery,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'

import type { FiatRampAction } from './FiatRampsCommon'

import { FiatForm } from '@/components/Modals/FiatRamps/views/FiatForm'
import { Text } from '@/components/Text'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { useModal } from '@/hooks/useModal/useModal'
import { breakpoints } from '@/theme/theme'

export type FiatRampsModalProps = {
  assetId: AssetId | undefined
  accountId?: AccountId
  fiatRampAction: FiatRampAction
}

const modalContentBorderRadius = { base: 0, md: 'xl' }
const modalContentMinWidth = { base: '100%', md: '500px' }
const modalContentMaxWidth = { base: 'full', md: '500px' }
const modalSize = { base: 'full', md: 'md' }

export const FiatRampsModal: React.FC<FiatRampsModalProps> = ({
  fiatRampAction,
  assetId,
  accountId,
}) => {
  const { close, isOpen } = useModal('fiatRamps')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const { modalContentProps, overlayProps, modalProps } = useModalRegistration({
    isOpen,
    onClose: close,
    modalId: 'fiat-ramps-modal',
  })

  return (
    <Modal {...modalProps} isCentered={isLargerThanMd} variant='fluid' size={modalSize}>
      <ModalOverlay {...overlayProps} />

      <ModalContent
        width='full'
        borderRadius={modalContentBorderRadius}
        minWidth={modalContentMinWidth}
        maxWidth={modalContentMaxWidth}
        {...modalContentProps}
      >
        <ModalHeader>
          <Text translation={'fiatRamps.title'} />
        </ModalHeader>
        <ModalCloseButton />
        <FiatForm assetId={assetId} fiatRampAction={fiatRampAction} accountId={accountId} />
      </ModalContent>
    </Modal>
  )
}

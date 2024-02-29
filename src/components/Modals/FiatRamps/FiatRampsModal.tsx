import { Modal, ModalContent, ModalOverlay, useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { FiatForm } from 'components/Modals/FiatRamps/views/FiatForm'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import type { FiatRampAction } from './FiatRampsCommon'

export type FiatRampsModalProps = {
  assetId: AssetId
  accountId?: AccountId
  fiatRampAction: FiatRampAction
}

const modalContentBorderRadius = { base: 0, md: 'xl' }
const modalContentMinWidth = { base: '100%', md: '500px' }
const modalContentMaxWidth = { base: 'full', md: '500px' }

export const FiatRampsModal: React.FC<FiatRampsModalProps> = ({
  fiatRampAction,
  assetId,
  accountId,
}) => {
  const { close, isOpen } = useModal('fiatRamps')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      isCentered={isLargerThanMd}
      variant='fluid'
      trapFocus={false}
    >
      <ModalOverlay />

      <ModalContent
        width='full'
        borderRadius={modalContentBorderRadius}
        minWidth={modalContentMinWidth}
        maxWidth={modalContentMaxWidth}
      >
        <FiatForm assetId={assetId} fiatRampAction={fiatRampAction} accountId={accountId} />
      </ModalContent>
    </Modal>
  )
}

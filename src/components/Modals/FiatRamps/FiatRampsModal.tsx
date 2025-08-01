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

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      isCentered={isLargerThanMd}
      variant='fluid'
      trapFocus={false}
      size={modalSize}
    >
      <ModalOverlay />

      <ModalContent
        width='full'
        borderRadius={modalContentBorderRadius}
        minWidth={modalContentMinWidth}
        maxWidth={modalContentMaxWidth}
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

import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { useDisclosure } from '@chakra-ui/react'
import { getConfig } from 'config'
import { OptInModalBody } from 'plugins/pendo/components/OptInModal/OptInModalBody'
import { launch } from 'plugins/pendo/index'
import { VisitorDataManager } from 'plugins/pendo/visitorData'
import { useEffect } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile } from 'lib/globals'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['Plugins', 'Pendo', 'OptInModal'] })
export const OptInModal: React.FC = () => {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const { state } = useWallet()

  const enabled = useFeatureFlag('Pendo')
  const hasWallet =
    Boolean(state.walletInfo?.deviceId) && state.walletInfo?.deviceId !== 'DemoWallet'

  moduleLogger.trace({ hasWallet, isOpen, wallet: state.walletInfo?.deviceId }, 'OptInModal render')

  /**
   * If a user that has a saved local wallet loads the page, but has not consented
   * we need to show the consent modal.
   * Do not show the consent modal for the demo wallet.
   */
  useEffect(() => {
    if (!enabled) return

    const CONSENT_TAG = `pendo_${getConfig().REACT_APP_PENDO_CONSENT_VERSION}`
    const consent = VisitorDataManager.checkConsent(CONSENT_TAG)
    moduleLogger.trace({ consent }, 'Consent Check')
    if (isMobile || consent) {
      // Auto launch if mobile or if they have consented
      if (isMobile && !consent) {
        VisitorDataManager.recordConsent(CONSENT_TAG, true)
      }
      launch()
    } else if (!consent && !isOpen && hasWallet) {
      moduleLogger.debug({ consent }, 'Showing consent modal')
      onOpen()
    }
  }, [enabled, hasWallet, isOpen, onOpen])

  return enabled ? (
    <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <OptInModalBody onContinue={onClose} />
      </ModalContent>
    </Modal>
  ) : null
}

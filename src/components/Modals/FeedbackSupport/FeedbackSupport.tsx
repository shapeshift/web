import { ChatIcon, EditIcon } from '@chakra-ui/icons'
import {
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { VscFeedback } from 'react-icons/vsc'
import { useTranslate } from 'react-polyglot'

import { DiscordIcon } from '@/components/Icons/Discord'
import { MainNavLink } from '@/components/Layout/Header/NavBar/MainNavLink'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { useModal } from '@/hooks/useModal/useModal'

const chatIcon = <ChatIcon />
const discordIcon = <DiscordIcon />
const editIcon = <EditIcon />
const feedbackIcon = <VscFeedback />

export const FeedbackAndSupport = () => {
  const { close, isOpen } = useModal('feedbackSupport')
  const translate = useTranslate()
  const isChatwootEnabled = import.meta.env.VITE_FEATURE_CHATWOOT === 'true'
  const { modalContentProps, overlayProps, modalProps } = useModalRegistration({
    isOpen,
    onClose: close,
    modalId: 'feedback-support-modal',
  })

  const handleChatWoot = useCallback(() => {
    // @ts-ignore
    if (window.$chatwoot) window.$chatwoot.toggle()
    close()
  }, [close])

  return (
    <Modal {...modalProps} isCentered size='sm'>
      <ModalOverlay {...overlayProps} />
      <ModalContent {...modalContentProps}>
        <ModalCloseButton />
        <ModalHeader>{translate('common.feedbackAndSupport')}</ModalHeader>
        <ModalBody>
          <Stack>
            {isChatwootEnabled && (
              <MainNavLink
                size='sm'
                onClick={handleChatWoot}
                label={translate('common.getSupport')}
                leftIcon={chatIcon}
              />
            )}
            <MainNavLink
              as={Link}
              // @ts-ignore
              isExternal
              size='sm'
              href='https://discord.gg/RQhAMsadpu' // unique link to attribute visitors, rather than discord.gg/shapeshift
              label={translate('common.joinDiscord')}
              leftIcon={discordIcon}
              data-test='navigation-join-discord-button'
            />
            <MainNavLink
              leftIcon={editIcon}
              as={Link}
              size='sm'
              label={translate('common.submitFeatureRequest')}
              // @ts-ignore
              isExternal
              href='https://shapeshift.canny.io/feature-requests'
            />
            <MainNavLink
              leftIcon={feedbackIcon}
              as={Link}
              size='sm'
              label={translate('common.submitFeedback')}
              // @ts-ignore
              isExternal
              href='https://forms.shapeshift.com/'
            />
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

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
import { useTranslate } from 'react-polyglot'
import { DiscordIcon } from 'components/Icons/Discord'
import { MainNavLink } from 'components/Layout/Header/NavBar/MainNavLink'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'

export const FeedbackAndSupport = () => {
  const { feedbackSupport } = useModal()
  const { close, isOpen } = feedbackSupport
  const translate = useTranslate()
  const isChatwootEnabled = useFeatureFlag('Chatwoot')

  const handleChatWoot = useCallback(() => {
    // @ts-ignore
    if (window.$chatwoot) window.$chatwoot.toggle()
    close()
  }, [close])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>{translate('common.feedbackAndSupport')}</ModalHeader>
        <ModalBody>
          <Stack>
            {isChatwootEnabled && (
              <MainNavLink
                size='sm'
                onClick={handleChatWoot}
                label={translate('common.getSupport')}
                leftIcon={<ChatIcon />}
              />
            )}
            <MainNavLink
              as={Link}
              isExternal
              size='sm'
              href='https://discord.gg/RQhAMsadpu' // unique link to attribute visitors, rather than discord.gg/shapeshift
              label={translate('common.joinDiscord')}
              leftIcon={<DiscordIcon />}
              data-test='navigation-join-discord-button'
            />
            <MainNavLink
              leftIcon={<EditIcon />}
              as={Link}
              size='sm'
              label={translate('common.submitFeedback')}
              isExternal
              href='https://shapeshift.notion.site/Submit-Feedback-or-a-Feature-Request-af48a25fea574da4a05a980c347c055b'
            />
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

import { Card } from '@chakra-ui/react'
import type { FC } from 'react'

import { RawText } from '@/components/Text'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'

type MessageContentProps = {
  message: string
}

export const MessageContent: FC<MessageContentProps> = ({ message }) => {
  return (
    <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.message'>
      <Card borderRadius='2xl' p={4}>
        <RawText fontWeight='medium' color='text.subtle'>
          {message}
        </RawText>
      </Card>
    </ModalSection>
  )
}

import { CloseButton, Flex } from '@chakra-ui/react'

import type { ActionMessage as ActionMessageType } from '../../hooks/useAffiliateActions'

interface ActionMessageProps {
  message: ActionMessageType
  onDismiss: () => void
}

export const ActionMessage = ({ message, onDismiss }: ActionMessageProps): React.JSX.Element => {
  const isSuccess = message.type === 'success'
  return (
    <Flex
      role='status'
      justify='space-between'
      align='center'
      px={4}
      py={3}
      borderRadius='lg'
      border='1px solid'
      bg={isSuccess ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)'}
      borderColor={isSuccess ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
      color={isSuccess ? 'success' : 'danger'}
      fontSize='sm'
    >
      {message.text}
      <CloseButton size='sm' onClick={onDismiss} color='inherit' />
    </Flex>
  )
}

import { Button, Text, VStack } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { FiMessageSquare } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch } from '@/state/store'

const MESSAGE_SQUARE_ICON = <FiMessageSquare size={24} color='var(--chakra-colors-purple-500)' />

export const DrawerChatButton = memo(() => {
  const isEnabled = useFeatureFlag('AgenticChat')
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const handleClick = useCallback(() => {
    dispatch(agenticChatSlice.actions.openChat())
  }, [dispatch])

  if (!isEnabled) return null

  return (
    <Button flex='1' height='80px' borderRadius='xl' alignItems='center' onClick={handleClick}>
      <VStack spacing={2} justify='center' align='center'>
        {MESSAGE_SQUARE_ICON}
        <Text fontSize='sm' fontWeight='medium' color='text.subtle'>
          {translate('agenticChat.aiChat')}
        </Text>
      </VStack>
    </Button>
  )
})

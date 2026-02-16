import { useCallback } from 'react'

import { generateConversationId } from '../utils/conversationUtils'

import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch } from '@/state/store'

export const useNewConversation = () => {
  const dispatch = useAppDispatch()

  return useCallback(() => {
    const newConversationId = generateConversationId()
    dispatch(agenticChatSlice.actions.createConversation({ id: newConversationId }))
  }, [dispatch])
}

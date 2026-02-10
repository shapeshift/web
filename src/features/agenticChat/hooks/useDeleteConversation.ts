import { useCallback } from 'react'

import { deleteMessages } from '../utils/conversationStorage'

import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch } from '@/state/store'

export const useDeleteConversation = () => {
  const dispatch = useAppDispatch()

  return useCallback(
    (conversationId: string) => {
      deleteMessages(conversationId)
      dispatch(agenticChatSlice.actions.deleteConversation(conversationId))
    },
    [dispatch],
  )
}

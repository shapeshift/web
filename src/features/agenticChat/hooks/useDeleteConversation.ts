import { useCallback } from 'react'

import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch } from '@/state/store'

export const useDeleteConversation = () => {
  const dispatch = useAppDispatch()

  return useCallback(
    (conversationId: string) => {
      dispatch(agenticChatSlice.actions.deleteConversation(conversationId))
    },
    [dispatch],
  )
}

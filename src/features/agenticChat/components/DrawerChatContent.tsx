import { Box, Flex, Spinner, useColorModeValue } from '@chakra-ui/react'
import { lazy, memo, Suspense, useEffect } from 'react'

import { useAgenticChat } from '@/features/agenticChat/hooks/useAgenticChat'
import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const Chat = lazy(() => import('./Chat').then(m => ({ default: m.Chat })))
const Composer = lazy(() => import('./Composer').then(m => ({ default: m.Composer })))

export const DrawerChatContent = memo(() => {
  const dispatch = useAppDispatch()
  const chat = useAgenticChat()
  const pendingMessage = useAppSelector(agenticChatSlice.selectors.selectPendingMessage)

  const borderColor = useColorModeValue('gray.200', 'gray.700')

  useEffect(() => {
    if (pendingMessage) {
      chat.sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: pendingMessage }],
      })
      dispatch(agenticChatSlice.actions.closeChat())
      dispatch(agenticChatSlice.actions.openChat())
    }
  }, [pendingMessage, chat, dispatch])

  return (
    <Flex direction='column' flex={1} overflow='hidden' minHeight={0}>
      <Suspense
        fallback={
          <Flex flex={1} alignItems='center' justifyContent='center'>
            <Spinner />
          </Flex>
        }
      >
        <Flex direction='column' flex={1} minHeight={0}>
          <Chat chat={chat} />
        </Flex>

        <Box p={4} borderTop='1px solid' borderColor={borderColor} flexShrink={0}>
          <Composer chat={chat} />
        </Box>
      </Suspense>
    </Flex>
  )
})

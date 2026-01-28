import { Box, Flex, Spinner, useColorModeValue } from '@chakra-ui/react'
import { lazy, memo, Suspense, useEffect, useRef } from 'react'

import { useAgenticChat } from '@/features/agenticChat/hooks/useAgenticChat'
import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const Chat = lazy(() => import('./Chat').then(m => ({ default: m.Chat })))
const Composer = lazy(() => import('./Composer').then(m => ({ default: m.Composer })))

export const DrawerChatContent = memo(() => {
  const dispatch = useAppDispatch()
  const chat = useAgenticChat()
  const { setInput } = chat
  const pendingMessage = useAppSelector(agenticChatSlice.selectors.selectPendingMessage)
  const pendingMessageRef = useRef(pendingMessage)

  const drawerBg = useColorModeValue('gray.50', 'gray.800')

  useEffect(() => {
    const initialMessage = pendingMessageRef.current
    if (initialMessage) {
      setInput(initialMessage)
      dispatch(agenticChatSlice.actions.clearPendingMessage())
    }
  }, [setInput, dispatch])

  return (
    <Flex direction='column' flex={1} overflow='hidden' minHeight={0} bg={drawerBg}>
      <Suspense
        fallback={
          <Flex flex={1} alignItems='center' justifyContent='center'>
            <Spinner />
          </Flex>
        }
      >
        <Chat chat={chat} />

        <Box px={4} pb={4} pt={2} flexShrink={0}>
          <Composer chat={chat} />
        </Box>
      </Suspense>
    </Flex>
  )
})

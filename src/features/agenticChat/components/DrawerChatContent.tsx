import { Box, Flex, IconButton, Spinner, Text, useColorModeValue } from '@chakra-ui/react'
import { lazy, memo, Suspense, useCallback, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import { useAgenticChat } from '@/features/agenticChat/hooks/useAgenticChat'
import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const Chat = lazy(() => import('./Chat').then(m => ({ default: m.Chat })))
const Composer = lazy(() => import('./Composer').then(m => ({ default: m.Composer })))

const CLOSE_ICON = <FiX />

export const DrawerChatContent = memo(() => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const chat = useAgenticChat()
  const pendingMessage = useAppSelector(agenticChatSlice.selectors.selectPendingMessage)

  const headerBg = useColorModeValue('gray.50', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const handleClose = useCallback(() => {
    dispatch(agenticChatSlice.actions.closeChat())
  }, [dispatch])

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
    <>
      <Flex
        bg={headerBg}
        px={4}
        py={3}
        alignItems='center'
        justifyContent='space-between'
        borderBottom='1px solid'
        borderColor={borderColor}
      >
        <Text fontWeight='semibold' fontSize='md'>
          {translate('agenticChat.title')}
        </Text>
        <IconButton
          icon={CLOSE_ICON}
          aria-label={translate('agenticChat.closeChat')}
          onClick={handleClose}
          size='sm'
          variant='ghost'
        />
      </Flex>

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

        <Box p={4} borderTop='1px solid' borderColor={borderColor}>
          <Composer chat={chat} />
        </Box>
      </Suspense>
    </>
  )
})

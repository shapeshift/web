import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { UIMessage } from 'ai'
import { isToolOrDynamicToolUIPart } from 'ai'
import { memo, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'

import type { AgenticChatHelpers } from '../hooks/useAgenticChat'
import { LoadingIndicator } from './LoadingIndicator'
import { Markdown } from './Markdown'
import { ToolInvocationRenderer } from './ToolInvocationRenderer'

type ChatProps = {
  chat: AgenticChatHelpers
}

type MessageItemProps = {
  message: UIMessage
  userBg: string
}

const MessageItem = memo(({ message, userBg }: MessageItemProps) => {
  const textContent = useMemo(
    () =>
      message.parts
        .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
        .map(part => part.text)
        .join(''),
    [message.parts],
  )

  const toolInvocations = useMemo(
    () => message.parts.filter(isToolOrDynamicToolUIPart),
    [message.parts],
  )

  const hasContent = textContent.trim().length > 0 || toolInvocations.length > 0

  if (!hasContent) return null

  const isUser = message.role === 'user'

  const bubbleStyles = isUser
    ? {
        bg: userBg,
        px: 3,
        py: 2,
        borderRadius: 'lg',
      }
    : {}

  return (
    <Box alignSelf={isUser ? 'flex-end' : 'flex-start'} maxW='80%' {...bubbleStyles}>
      {toolInvocations.map(toolPart => (
        <ToolInvocationRenderer key={toolPart.toolCallId} toolPart={toolPart} />
      ))}
      {textContent.trim().length > 0 && <Markdown>{textContent}</Markdown>}
    </Box>
  )
})

MessageItem.displayName = 'MessageItem'

export const Chat = ({ chat }: ChatProps) => {
  const translate = useTranslate()
  const { messages, status } = chat
  const viewportRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  const userBg = useColorModeValue('blue.50', 'blue.600')

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleScroll = () => {
      const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100
      shouldAutoScrollRef.current = isNearBottom
    }

    viewport.addEventListener('scroll', handleScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [messages])

  const isLoading = status === 'submitted' || status === 'streaming'
  const isEmpty = messages.length === 0

  return (
    <Flex
      ref={viewportRef}
      direction='column'
      gap={3}
      flex={1}
      overflowY='auto'
      px={4}
      pb={2}
      minHeight={0}
    >
      {isEmpty ? (
        <Flex flex={1} alignItems='center' justifyContent='center'>
          <Text fontSize='lg'>{translate('agenticChat.emptyState')}</Text>
        </Flex>
      ) : (
        <>
          {messages.map((message: UIMessage) => (
            <MessageItem key={message.id} message={message} userBg={userBg} />
          ))}
          {isLoading && <LoadingIndicator />}
          <div ref={bottomRef} />
        </>
      )}
    </Flex>
  )
}

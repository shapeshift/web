import { Flex, IconButton, Textarea, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useRef } from 'react'
import { FiSend, FiSquare } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import type { AgenticChatHelpers } from '../hooks/useAgenticChat'

const SEND_ICON = <FiSend />
const STOP_ICON = <FiSquare />

type ComposerProps = {
  chat: AgenticChatHelpers
}

export const Composer = ({ chat }: ComposerProps) => {
  const translate = useTranslate()
  const { input, handleInputChange, handleSubmit, status, stop } = chat
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const isLoading = status === 'streaming'

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (input.trim()) {
          handleSubmit()
        }
      }
    },
    [input, handleSubmit],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange(e)
    },
    [handleInputChange],
  )

  return (
    <Flex gap={2} alignItems='flex-end'>
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={translate('agenticChat.placeholder')}
        resize='none'
        rows={1}
        py={3}
        flex={1}
        borderColor={borderColor}
        _focus={{ borderColor: 'blue.500' }}
        autoComplete='new-password'
        data-form-type='other'
        data-lpignore='true'
        data-1p-ignore='true'
        sx={{
          minHeight: '48px',
          maxHeight: '200px',
          fieldSizing: 'content',
        }}
      />
      <IconButton
        icon={isLoading ? STOP_ICON : SEND_ICON}
        aria-label={translate(isLoading ? 'agenticChat.stop' : 'agenticChat.send')}
        onClick={isLoading ? stop : () => handleSubmit()}
        height='48px'
        minWidth='48px'
        colorScheme='blue'
        isDisabled={!isLoading && !input.trim()}
      />
    </Flex>
  )
}

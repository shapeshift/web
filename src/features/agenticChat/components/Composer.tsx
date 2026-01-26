import { Box, Flex, IconButton, Textarea, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
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

  const composerBg = useColorModeValue('white', 'gray.700')
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

  return (
    <Box
      bg={composerBg}
      borderRadius='xl'
      border='1px solid'
      borderColor={borderColor}
      p={2}
      boxShadow='sm'
    >
      <Flex gap={2} alignItems='flex-end'>
        <Textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={translate('agenticChat.placeholder')}
          resize='none'
          rows={1}
          py={2}
          flex={1}
          border='none'
          _focus={{ outline: 'none', boxShadow: 'none' }}
          _focusVisible={{ outline: 'none', boxShadow: 'none' }}
          autoComplete='new-password'
          data-form-type='other'
          data-lpignore='true'
          data-1p-ignore='true'
          sx={{
            minHeight: '40px',
            maxHeight: '200px',
            fieldSizing: 'content',
          }}
        />
        <IconButton
          icon={isLoading ? STOP_ICON : SEND_ICON}
          aria-label={translate(isLoading ? 'agenticChat.stop' : 'agenticChat.send')}
          onClick={isLoading ? stop : () => handleSubmit()}
          size='md'
          colorScheme='blue'
          isDisabled={!isLoading && !input.trim()}
        />
      </Flex>
    </Box>
  )
}

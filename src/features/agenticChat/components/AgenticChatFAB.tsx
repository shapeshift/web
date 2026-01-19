import { Box, IconButton, useColorModeValue } from '@chakra-ui/react'
import { useState } from 'react'
import { FiMessageSquare } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import { AgenticChatWindow } from './AgenticChatWindow'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

const MESSAGE_SQUARE_ICON = <FiMessageSquare />

export const AgenticChatFAB = () => {
  const isEnabled = useFeatureFlag('AgenticChat')
  const [isOpen, setIsOpen] = useState(false)
  const translate = useTranslate()

  const bg = useColorModeValue('blue.500', 'blue.300')
  const hoverBg = useColorModeValue('blue.600', 'blue.400')

  if (!isEnabled) return null

  return (
    <>
      <Box
        position='fixed'
        bottom={{ base: 'calc(80px + env(safe-area-inset-bottom))', md: 8 }}
        right={{ base: 4, md: 8 }}
        zIndex='banner'
      >
        <IconButton
          icon={MESSAGE_SQUARE_ICON}
          aria-label={translate('agenticChat.openChat')}
          onClick={() => setIsOpen(true)}
          bg={bg}
          color='white'
          borderRadius='full'
          size='lg'
          boxShadow='lg'
          _hover={{ bg: hoverBg }}
        />
      </Box>
      <AgenticChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

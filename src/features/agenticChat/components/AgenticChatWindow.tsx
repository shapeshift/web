import {
  Box,
  Flex,
  IconButton,
  Spinner,
  Text,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import { lazy, Suspense } from 'react'
import { FiX } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useAgenticChat } from '@/features/agenticChat/hooks/useAgenticChat'
import { breakpoints } from '@/theme/theme'

const Chat = lazy(() => import('./Chat').then(m => ({ default: m.Chat })))
const Composer = lazy(() => import('./Composer').then(m => ({ default: m.Composer })))

const CLOSE_ICON = <FiX />

type AgenticChatWindowProps = {
  isOpen: boolean
  onClose: () => void
}

export const AgenticChatWindow = ({ isOpen, onClose }: AgenticChatWindowProps) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const chat = useAgenticChat()

  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const headerBg = useColorModeValue('gray.50', 'gray.900')

  const content = (
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
          onClick={onClose}
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

  if (isLargerThanMd) {
    if (!isOpen) return null

    return (
      <Box
        position='fixed'
        bottom={8}
        right={8}
        width='400px'
        height='600px'
        bg={bg}
        borderRadius='xl'
        boxShadow='2xl'
        border='1px solid'
        borderColor={borderColor}
        zIndex='modal'
        display='flex'
        flexDirection='column'
        overflow='hidden'
      >
        {content}
      </Box>
    )
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} isFullScreen>
      {content}
    </Dialog>
  )
}

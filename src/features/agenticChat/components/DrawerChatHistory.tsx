import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { TbPlus, TbTrash } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { deleteMessages } from '../utils/conversationStorage'
import { generateConversationId } from '../utils/conversationUtils'

import { useModalRegistration } from '@/context/ModalStackProvider/useModalRegistration'
import { agenticChatSlice } from '@/state/slices/agenticChatSlice/agenticChatSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const newChatIcon = <TbPlus />
const deleteIcon = <TbTrash />
const searchIcon = <FiSearch />

export const DrawerChatHistory = memo(() => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const conversations = useAppSelector(agenticChatSlice.selectors.selectConversations)
  const activeConversationId = useAppSelector(agenticChatSlice.selectors.selectActiveConversationId)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const handleOpenDeleteDialog = useCallback(() => setIsDeleteDialogOpen(true), [])
  const handleCloseDeleteDialog = useCallback(() => setIsDeleteDialogOpen(false), [])
  const cancelRef = useRef<HTMLButtonElement>(null)

  const {
    modalProps: deleteModalProps,
    overlayProps: deleteOverlayProps,
    modalContentProps: deleteContentProps,
  } = useModalRegistration({
    isOpen: isDeleteDialogOpen,
    onClose: handleCloseDeleteDialog,
  })

  const sortedConversations = useMemo(
    () =>
      conversations
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [conversations],
  )

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return sortedConversations

    const query = searchQuery.toLowerCase()
    return sortedConversations.filter(conv => conv.title.toLowerCase().includes(query))
  }, [sortedConversations, searchQuery])

  // UI colors
  const activeBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const hoverBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const handleNewChat = useCallback(() => {
    const newConversationId = generateConversationId()
    dispatch(
      agenticChatSlice.actions.createConversation({
        id: newConversationId,
      }),
    )
    dispatch(agenticChatSlice.actions.closeChatHistory())
  }, [dispatch])

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      dispatch(agenticChatSlice.actions.setActiveConversation(conversationId))
      dispatch(agenticChatSlice.actions.closeChatHistory())
    },
    [dispatch],
  )

  const handleDeleteClick = useCallback(
    (conversationId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setConversationToDelete(conversationId)
      handleOpenDeleteDialog()
    },
    [handleOpenDeleteDialog],
  )

  const handleConfirmDelete = useCallback(() => {
    if (conversationToDelete) {
      deleteMessages(conversationToDelete)
      dispatch(agenticChatSlice.actions.deleteConversation(conversationToDelete))
      setConversationToDelete(null)
    }
    handleCloseDeleteDialog()
  }, [conversationToDelete, dispatch, handleCloseDeleteDialog])

  const handleCancelDelete = useCallback(() => {
    setConversationToDelete(null)
    handleCloseDeleteDialog()
  }, [handleCloseDeleteDialog])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }, [])

  return (
    <>
      <Flex direction='column' flex={1} overflow='hidden' minHeight={0}>
        <Box px={4} py={3}>
          <Flex justify='space-between' align='center' mb={3}>
            <Heading size='md'>{translate('agenticChat.chatHistory')}</Heading>
            <Button leftIcon={newChatIcon} onClick={handleNewChat} size='sm' colorScheme='blue'>
              {translate('agenticChat.newChat')}
            </Button>
          </Flex>

          <InputGroup size='md'>
            <InputLeftElement pointerEvents='none'>{searchIcon}</InputLeftElement>
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              type='text'
              placeholder={translate('agenticChat.searchChats')}
              variant='filled'
              borderRadius='lg'
            />
          </InputGroup>
        </Box>

        <Box flex={1} overflow='auto' px={4} className='scroll-container'>
          {filteredConversations.length === 0 ? (
            <Flex justify='center' align='center' height='100%'>
              <Text color='text.subtle'>
                {searchQuery.trim()
                  ? translate('agenticChat.noMatchingConversations')
                  : translate('agenticChat.noConversations')}
              </Text>
            </Flex>
          ) : (
            <VStack spacing={0} align='stretch'>
              {filteredConversations.map((conversation, index) => (
                <Box key={conversation.id}>
                  <Flex
                    bg={conversation.id === activeConversationId ? activeBg : 'transparent'}
                    borderTopRadius={index === 0 ? 'md' : 0}
                    borderBottomRadius={index === filteredConversations.length - 1 ? 'md' : 0}
                    p={3}
                    cursor='pointer'
                    onClick={() => handleSelectConversation(conversation.id)}
                    _hover={conversation.id === activeConversationId ? {} : { bg: hoverBg }}
                    align='center'
                    gap={2}
                    transition='all 0.2s'
                    sx={{ '&:hover .delete-btn': { opacity: 1 } }}
                  >
                    <Flex direction='column' flex={1} minWidth={0}>
                      <Text fontWeight='medium' noOfLines={1}>
                        {conversation.title}
                      </Text>
                      <Text fontSize='xs' color='text.subtle' opacity={0.6}>
                        {formatDate(conversation.updatedAt)}
                      </Text>
                    </Flex>
                    <Box className='delete-btn' opacity={0} transition='opacity 0.2s'>
                      <IconButton
                        icon={deleteIcon}
                        aria-label={translate('agenticChat.deleteConversation')}
                        size='sm'
                        variant='ghost'
                        colorScheme='red'
                        onClick={e => handleDeleteClick(conversation.id, e)}
                      />
                    </Box>
                  </Flex>
                  {index < filteredConversations.length - 1 && (
                    <Divider borderColor={borderColor} opacity={0.6} />
                  )}
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </Flex>

      <AlertDialog {...deleteModalProps} leastDestructiveRef={cancelRef} isCentered>
        <AlertDialogOverlay {...deleteOverlayProps}>
          <AlertDialogContent {...deleteContentProps}>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              {translate('agenticChat.deleteConversation')}
            </AlertDialogHeader>

            <AlertDialogBody>{translate('agenticChat.deleteConfirmation')}</AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCancelDelete}>
                {translate('common.cancel')}
              </Button>
              <Button colorScheme='red' onClick={handleConfirmDelete} ml={3}>
                {translate('common.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
})

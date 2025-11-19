import {
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  HStack,
  IconButton,
  Input,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { IoMdAdd, IoMdCreate, IoMdTrash } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'

import { useGridPlusConnection } from '../hooks/useGridPlusConnection'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import type { SafeCard } from '@/state/slices/gridplusSlice/types'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch } from '@/state/store'

const AddIcon = <IoMdAdd />
const CreateIcon = <IoMdCreate />
const TrashIcon = <IoMdTrash />

const hoverSx = { borderColor: 'border.focused' }

export const SafeCardList = () => {
  const translate = useTranslate()
  const { safeCards, handleSelectSafeCard, handleAddNew, connectingCardId, error } =
    useGridPlusConnection()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [safeCardToDelete, setSafeCardToDelete] = useState<SafeCard | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dispatch = useAppDispatch()
  const toast = useToast()
  const { state: walletState } = useWallet()

  const handleRenameBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const id = e.currentTarget.dataset.id
      if (id && editName.trim()) {
        dispatch(
          gridplusSlice.actions.setSafeCardName({
            id,
            name: editName.trim(),
          }),
        )
        setEditingId(null)
      }
    },
    [editName, dispatch],
  )

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const id = e.currentTarget.dataset.id
      if (e.key === 'Enter' && id && editName.trim()) {
        dispatch(
          gridplusSlice.actions.setSafeCardName({
            id,
            name: editName.trim(),
          }),
        )
        setEditingId(null)
      }
      if (e.key === 'Escape') {
        setEditingId(null)
        setEditName('')
      }
    },
    [editName, dispatch],
  )

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const id = e.currentTarget.dataset.id
      const safeCard = safeCards.find(card => card.id === id)
      if (safeCard) {
        setSafeCardToDelete(safeCard)
        onOpen()
      }
    },
    [safeCards, onOpen],
  )

  const handleEditClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id && name) {
      setEditingId(id)
      setEditName(name)
    }
  }, [])

  const handleSelectClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const id = e.currentTarget.dataset.id
      if (id) {
        handleSelectSafeCard(id)
      }
    },
    [handleSelectSafeCard],
  )

  const handleDeleteConfirm = useCallback(() => {
    if (!safeCardToDelete) return

    const walletId = `gridplus:${safeCardToDelete.id}`
    dispatch(portfolio.actions.clearWalletPortfolioState(walletId))
    dispatch(gridplusSlice.actions.removeSafeCard(safeCardToDelete.id))

    toast({
      title: translate('walletProvider.gridplus.list.deleted'),
      description: translate('walletProvider.gridplus.list.deletedDescription'),
      status: 'info',
      duration: 3000,
      isClosable: true,
    })

    onClose()
    setSafeCardToDelete(null)
  }, [safeCardToDelete, dispatch, toast, translate, onClose])

  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value)
  }, [])

  const sortedSafeCards = useMemo(
    () =>
      [...safeCards].sort((a, b) => {
        if (a.lastConnectedAt && b.lastConnectedAt) {
          return b.lastConnectedAt - a.lastConnectedAt
        }
        if (a.lastConnectedAt) return -1
        if (b.lastConnectedAt) return 1
        return b.createdAt - a.createdAt
      }),
    [safeCards],
  )

  const cards = useMemo(
    () =>
      sortedSafeCards.map(safeCard => {
        const isActive =
          walletState.isConnected && walletState.deviceId === `gridplus:${safeCard.id}`
        const isConnecting = connectingCardId === safeCard.id

        return (
          <Box
            key={safeCard.id}
            p={4}
            borderWidth={1}
            borderRadius='lg'
            borderColor='border.base'
            _hover={hoverSx}
            bg='background.surface.raised.base'
          >
            <HStack spacing={3}>
              <Box color='text.subtle'>
                <FaWallet size={20} />
              </Box>

              {editingId === safeCard.id ? (
                <Input
                  size='sm'
                  value={editName}
                  onChange={handleEditNameChange}
                  data-id={safeCard.id}
                  onBlur={handleRenameBlur}
                  onKeyDown={handleRenameKeyDown}
                  autoFocus
                  flex={1}
                />
              ) : (
                <VStack align='start' flex={1} spacing={0}>
                  <Text fontWeight='medium'>{safeCard.name}</Text>
                  {safeCard.lastConnectedAt && (
                    <Text fontSize='xs' color='text.subtle'>
                      {translate('walletProvider.gridplus.list.lastConnected', {
                        date: new Date(safeCard.lastConnectedAt).toLocaleDateString(),
                      })}
                    </Text>
                  )}
                </VStack>
              )}

              <ButtonGroup size='sm'>
                {editingId !== safeCard.id && (
                  <IconButton
                    icon={CreateIcon}
                    aria-label={translate('walletProvider.gridplus.list.editNameLabel')}
                    variant='ghost'
                    data-id={safeCard.id}
                    data-name={safeCard.name}
                    onClick={handleEditClick}
                  />
                )}
                <IconButton
                  icon={TrashIcon}
                  aria-label={translate('walletProvider.gridplus.list.deleteLabel')}
                  variant='ghost'
                  colorScheme='red'
                  data-id={safeCard.id}
                  onClick={handleDeleteClick}
                />
                <Button
                  data-id={safeCard.id}
                  onClick={handleSelectClick}
                  colorScheme='blue'
                  isDisabled={isActive || isConnecting}
                  isLoading={isConnecting}
                >
                  {isActive
                    ? translate('walletProvider.gridplus.list.connected')
                    : translate('walletProvider.gridplus.list.connect')}
                </Button>
              </ButtonGroup>
            </HStack>
          </Box>
        )
      }),
    [
      sortedSafeCards,
      walletState.isConnected,
      walletState.deviceId,
      connectingCardId,
      editingId,
      editName,
      handleEditNameChange,
      handleRenameBlur,
      handleRenameKeyDown,
      handleEditClick,
      handleDeleteClick,
      handleSelectClick,
      translate,
    ],
  )

  if (!safeCards.length) {
    return (
      <VStack spacing={4} py={8}>
        <Text color='text.subtle'>{translate('walletProvider.gridplus.list.empty')}</Text>
        <Button leftIcon={AddIcon} onClick={handleAddNew} colorScheme='blue' size='lg'>
          {translate('walletProvider.gridplus.list.addFirst')}
        </Button>
      </VStack>
    )
  }

  return (
    <VStack spacing={3} align='stretch'>
      <Text fontSize='sm' color='text.subtle' mb={2}>
        {translate('walletProvider.gridplus.list.selectPrompt')}
      </Text>
      {error && (
        <Alert status='error' borderRadius='md'>
          <AlertIcon />
          <Text fontSize='sm'>{error}</Text>
        </Alert>
      )}
      {cards}
      <Button leftIcon={AddIcon} onClick={handleAddNew} variant='outline' colorScheme='blue' mt={2}>
        {translate('walletProvider.gridplus.list.addNew')}
      </Button>
      <Alert status='info' borderRadius='md' mt={4}>
        <AlertIcon />
        <Text fontSize='sm'>{translate('walletProvider.gridplus.list.warning')}</Text>
      </Alert>
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              {translate('walletProvider.gridplus.list.deleteTitle')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {safeCardToDelete &&
                translate('walletProvider.gridplus.list.deleteConfirm', {
                  name: safeCardToDelete.name,
                })}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                {translate('common.cancel')}
              </Button>
              <Button colorScheme='red' onClick={handleDeleteConfirm} ml={3}>
                {translate('common.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  )
}

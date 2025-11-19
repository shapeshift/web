import {
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertIcon,
  Button,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { IoMdAdd } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'

import { useGridPlusConnection } from '../hooks/useGridPlusConnection'
import { SafeCardRow } from './SafeCardRow'

import { useModalRegistration } from '@/context/ModalStackProvider'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import type { SafeCard } from '@/state/slices/gridplusSlice/types'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch } from '@/state/store'

const AddIcon = <IoMdAdd />

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

  const {
    modalProps: alertModalProps,
    overlayProps: alertOverlayProps,
    modalContentProps: alertContentProps,
  } = useModalRegistration({
    isOpen,
    onClose,
  })

  const handleRenameBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const id = e.currentTarget.dataset.id
      const trimmedName = editName.trim()

      if (id && trimmedName) {
        dispatch(
          gridplusSlice.actions.setSafeCardName({
            id,
            name: trimmedName,
          }),
        )
      }

      setEditingId(null)
      setEditName('')
    },
    [editName, dispatch],
  )

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const id = e.currentTarget.dataset.id
      const trimmedName = editName.trim()

      if (e.key === 'Enter') {
        if (id && trimmedName) {
          dispatch(
            gridplusSlice.actions.setSafeCardName({
              id,
              name: trimmedName,
            }),
          )
        }
        setEditingId(null)
        setEditName('')
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
      sortedSafeCards.map(safeCard => (
        <SafeCardRow
          key={safeCard.id}
          safeCard={safeCard}
          isActive={walletState.isConnected && walletState.deviceId === `gridplus:${safeCard.id}`}
          isConnecting={connectingCardId === safeCard.id}
          isEditing={editingId === safeCard.id}
          editName={editName}
          onEditNameChange={handleEditNameChange}
          onRenameBlur={handleRenameBlur}
          onRenameKeyDown={handleRenameKeyDown}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onSelectClick={handleSelectClick}
        />
      )),
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
      <AlertDialog {...alertModalProps} leastDestructiveRef={cancelRef}>
        <AlertDialogOverlay {...alertOverlayProps}>
          <AlertDialogContent {...alertContentProps}>
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

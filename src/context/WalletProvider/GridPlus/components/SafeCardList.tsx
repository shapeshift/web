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

import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import type { SafeCard } from '@/state/slices/gridplusSlice/types'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch } from '@/state/store'

const AddIcon = <IoMdAdd />
const CreateIcon = <IoMdCreate />
const TrashIcon = <IoMdTrash />

const hoverSx = { borderColor: 'border.focused' }

type SafeCardListProps = {
  safeCards: SafeCard[]
  onSelectSafeCard: (id: string) => void
  onAddNewSafeCard: () => void
  connectingCardId?: string | null
  error?: string | null
}

export const SafeCardList: React.FC<SafeCardListProps> = ({
  safeCards,
  onSelectSafeCard,
  onAddNewSafeCard,
  connectingCardId,
  error,
}) => {
  const translate = useTranslate()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [safeCardToDelete, setSafeCardToDelete] = useState<SafeCard | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dispatch = useAppDispatch()
  const toast = useToast()
  const { state: walletState } = useWallet()

  const handleRename = useCallback(
    (id: string) => {
      if (editName.trim()) {
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

  const handleDeleteClick = useCallback(
    (safeCard: SafeCard) => {
      setSafeCardToDelete(safeCard)
      onOpen()
    },
    [onOpen],
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
                  onBlur={() => handleRename(safeCard.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(safeCard.id)
                    if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditName('')
                    }
                  }}
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
                    onClick={() => {
                      setEditingId(safeCard.id)
                      setEditName(safeCard.name)
                    }}
                  />
                )}
                <IconButton
                  icon={TrashIcon}
                  aria-label={translate('walletProvider.gridplus.list.deleteLabel')}
                  variant='ghost'
                  colorScheme='red'
                  onClick={() => handleDeleteClick(safeCard)}
                />
                <Button
                  onClick={() => onSelectSafeCard(safeCard.id)}
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
      handleRename,
      handleDeleteClick,
      onSelectSafeCard,
      translate,
    ],
  )

  if (!safeCards.length) {
    return (
      <VStack spacing={4} py={8}>
        <Text color='text.subtle'>{translate('walletProvider.gridplus.list.empty')}</Text>
        <Button leftIcon={AddIcon} onClick={onAddNewSafeCard} colorScheme='blue' size='lg'>
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
      <Button
        leftIcon={AddIcon}
        onClick={onAddNewSafeCard}
        variant='outline'
        colorScheme='blue'
        mt={2}
      >
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

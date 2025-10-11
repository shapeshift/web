import {
  Alert,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  HStack,
  IconButton,
  Input,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { IoMdAdd, IoMdCreate, IoMdTrash } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import type { SafeCard } from '@/state/slices/gridplusSlice/types'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch } from '@/state/store'

// Static icon elements defined outside component to avoid re-renders
const AddIcon = <IoMdAdd />
const CreateIcon = <IoMdCreate />
const TrashIcon = <IoMdTrash />

interface SafeCardListProps {
  safeCards: SafeCard[]
  onSelectSafeCard: (id: string) => void
  onAddNew: () => void
}

export const SafeCardList: React.FC<SafeCardListProps> = ({
  safeCards,
  onSelectSafeCard,
  onAddNew,
}) => {
  const translate = useTranslate()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const dispatch = useAppDispatch()
  const toast = useToast()
  const { state: walletState } = useWallet()

  const handleRename = useCallback(
    (id: string) => {
      if (editName.trim()) {
        dispatch(
          gridplusSlice.actions.updateSafeCardName({
            id,
            name: editName.trim(),
          }),
        )
        setEditingId(null)
        toast({
          title: translate('walletProvider.gridplus.list.renamed'),
          status: 'success',
          duration: 2000,
          isClosable: true,
        })
      }
    },
    [editName, dispatch, toast, translate],
  )

  const handleDelete = useCallback(
    (safeCard: SafeCard) => {
      const confirmMsg = translate('walletProvider.gridplus.list.deleteConfirm', {
        name: safeCard.name,
      })

      if (window.confirm(confirmMsg)) {
        // Clear portfolio data for this wallet
        const walletId = `gridplus:${safeCard.id}`
        dispatch(portfolio.actions.clearWalletPortfolioState(walletId))

        // Remove SafeCard
        dispatch(gridplusSlice.actions.removeSafeCard(safeCard.id))

        toast({
          title: translate('walletProvider.gridplus.list.deleted'),
          description: translate('walletProvider.gridplus.list.deletedDescription'),
          status: 'info',
          duration: 3000,
          isClosable: true,
        })
      }
    },
    [dispatch, toast, translate],
  )

  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value)
  }, [])

  // Curried callback creators for use inside map
  const createEditClickHandler = useCallback(
    (id: string, name: string) => () => {
      setEditingId(id)
      setEditName(name)
    },
    [],
  )

  const createRenameBlurHandler = useCallback(
    (id: string) => () => handleRename(id),
    [handleRename],
  )

  const createKeyDownHandler = useCallback(
    (id: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleRename(id)
      if (e.key === 'Escape') {
        setEditingId(null)
        setEditName('')
      }
    },
    [handleRename],
  )

  const createDeleteClickHandler = useCallback(
    (safeCard: SafeCard) => () => handleDelete(safeCard),
    [handleDelete],
  )

  const createConnectClickHandler = useCallback(
    (id: string) => () => onSelectSafeCard(id),
    [onSelectSafeCard],
  )

  // Memoized style objects
  const hoverStyle = useMemo(() => ({ borderColor: 'border.focused' }), [])

  // Sort SafeCards by last connected, then by created date
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

  // Memoized card renderers
  const renderCards = useMemo(
    () =>
      sortedSafeCards.map(safeCard => {
        const isActive =
          walletState.isConnected && walletState.deviceId === `gridplus:${safeCard.id}`

        return (
          <Box
            key={safeCard.id}
            p={4}
            borderWidth={1}
            borderRadius='lg'
            borderColor='border.base'
            _hover={hoverStyle}
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
                  onBlur={createRenameBlurHandler(safeCard.id)}
                  onKeyDown={createKeyDownHandler(safeCard.id)}
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
                    onClick={createEditClickHandler(safeCard.id, safeCard.name)}
                  />
                )}
                <IconButton
                  icon={TrashIcon}
                  aria-label={translate('walletProvider.gridplus.list.deleteLabel')}
                  variant='ghost'
                  colorScheme='red'
                  onClick={createDeleteClickHandler(safeCard)}
                />
                <Button
                  onClick={createConnectClickHandler(safeCard.id)}
                  colorScheme='blue'
                  isDisabled={isActive}
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
      editingId,
      editName,
      hoverStyle,
      handleEditNameChange,
      createRenameBlurHandler,
      createKeyDownHandler,
      createEditClickHandler,
      createDeleteClickHandler,
      createConnectClickHandler,
      translate,
    ],
  )

  // Early return for empty state - need to reposition it after hooks
  if (safeCards.length === 0) {
    return (
      <VStack spacing={4} py={8}>
        <Text color='text.subtle'>{translate('walletProvider.gridplus.list.empty')}</Text>
        <Button leftIcon={AddIcon} onClick={onAddNew} colorScheme='blue' size='lg'>
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

      {renderCards}

      <Button leftIcon={AddIcon} onClick={onAddNew} variant='outline' colorScheme='blue' mt={2}>
        {translate('walletProvider.gridplus.list.addNew')}
      </Button>

      <Alert status='info' borderRadius='md' mt={4}>
        <AlertIcon />
        <Text fontSize='sm'>{translate('walletProvider.gridplus.list.warning')}</Text>
      </Alert>
    </VStack>
  )
}

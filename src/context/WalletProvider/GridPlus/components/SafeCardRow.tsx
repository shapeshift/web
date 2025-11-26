import { Box, Button, ButtonGroup, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'
import { FaWallet } from 'react-icons/fa'
import { IoMdCreate, IoMdTrash } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'

import type { SafeCard } from '@/state/slices/gridplusSlice/types'

const CreateIcon = <IoMdCreate />
const TrashIcon = <IoMdTrash />

const hoverSx = { borderColor: 'border.focused' }

type SafeCardRowProps = {
  safeCard: SafeCard
  isActive: boolean
  isConnecting: boolean
  isEditing: boolean
  editName: string
  onEditNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRenameBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  onRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onEditClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  onDeleteClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  onSelectClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export const SafeCardRow = memo(
  ({
    safeCard,
    isActive,
    isConnecting,
    isEditing,
    editName,
    onEditNameChange,
    onRenameBlur,
    onRenameKeyDown,
    onEditClick,
    onDeleteClick,
    onSelectClick,
  }: SafeCardRowProps) => {
    const translate = useTranslate()

    return (
      <Box
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

          {isEditing ? (
            <Input
              size='sm'
              value={editName}
              onChange={onEditNameChange}
              data-id={safeCard.id}
              onBlur={onRenameBlur}
              onKeyDown={onRenameKeyDown}
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
            {!isEditing && (
              <IconButton
                icon={CreateIcon}
                aria-label={translate('walletProvider.gridplus.list.editNameLabel')}
                variant='ghost'
                data-id={safeCard.id}
                data-name={safeCard.name}
                onClick={onEditClick}
              />
            )}
            <IconButton
              icon={TrashIcon}
              aria-label={translate('walletProvider.gridplus.list.deleteLabel')}
              variant='ghost'
              colorScheme='red'
              data-id={safeCard.id}
              onClick={onDeleteClick}
            />
            <Button
              data-id={safeCard.id}
              onClick={onSelectClick}
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
  },
)

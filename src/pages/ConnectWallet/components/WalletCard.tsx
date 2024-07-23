import { CheckCircleIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { Avatar, Button, Flex, IconButton } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'

const activeIcon = <CheckCircleIcon color='blue.500' ml='auto' />
const editIcon = <EditIcon />
const deleteIcon = <DeleteIcon />

type WalletCardProps = {
  id?: string
  wallet: RevocableWallet
  onClick?: (arg: RevocableWallet) => void
  isActive?: boolean
  isEditing?: boolean
  onRename?: (wallet: RevocableWallet) => void
  onDelete?: (wallet: RevocableWallet) => void
}

export const WalletCard: React.FC<WalletCardProps> = ({
  id,
  wallet,
  onClick,
  isActive,
  isEditing,
  onRename,
  onDelete,
}) => {
  const profileImage = useMemo(() => {
    if (!id) return ''
    return makeBlockiesUrl(`${id}ifyoudriveatruckdriveitlikeyouhaveafarm`)
  }, [id])

  const avatar = useMemo(
    () => <Avatar src={profileImage} size='md' borderRadius='lg' />,
    [profileImage],
  )
  const handleClick = useCallback(() => {
    onClick && onClick(wallet)
  }, [onClick, wallet])

  const handleRename = useCallback(() => onRename && onRename(wallet), [onRename, wallet])
  const handleDelete = useCallback(() => onDelete && onDelete(wallet), [onDelete, wallet])

  const rightElement = useMemo(() => {
    if (isEditing) {
      return (
        <Flex ml='auto'>
          <IconButton
            as='a'
            aria-label='Rename'
            variant='ghost'
            icon={editIcon}
            onClick={handleRename}
          />
          <IconButton
            as='a'
            aria-label='Delete'
            variant='ghost'
            icon={deleteIcon}
            onClick={handleDelete}
          />
        </Flex>
      )
    }
    if (isActive) {
      return activeIcon
    }
  }, [handleDelete, handleRename, isActive, isEditing])
  return (
    <Button onClick={handleClick} height='auto' p={4} leftIcon={avatar} justifyContent='flex-start'>
      {wallet.label}
      {rightElement}
    </Button>
  )
}

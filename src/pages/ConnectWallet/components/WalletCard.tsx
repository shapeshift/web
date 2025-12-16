import { CheckCircleIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import type { AvatarProps, ButtonProps } from '@chakra-ui/react'
import { Avatar, Box, Button, Flex, IconButton, Spinner } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'

const activeIcon = <CheckCircleIcon color='blue.500' ml='auto' />
const editIcon = <EditIcon />
const deleteIcon = <DeleteIcon />
const initializingIcon = <Spinner />

type WalletCardProps = {
  id?: string
  wallet: RevocableWallet
  buttonProps?: ButtonProps
  avatarSize?: AvatarProps['size']
  onClick?: (arg: RevocableWallet) => Promise<void>
  isActive?: boolean
  isEditing?: boolean
  isInitializing?: boolean
  isDisabled?: boolean
  onRename?: (wallet: RevocableWallet) => void
  onDelete?: (wallet: RevocableWallet) => void
  _active?: ButtonProps['_active']
  _hover?: ButtonProps['_hover']
}

export const WalletCard: React.FC<WalletCardProps> = ({
  id,
  wallet,
  onClick,
  buttonProps,
  avatarSize = 'md',
  isActive,
  isEditing,
  isInitializing,
  isDisabled,
  onRename,
  onDelete,
  _active,
  _hover,
}) => {
  const translate = useTranslate()
  const profileImage = useMemo(() => {
    if (!id) return ''
    return makeBlockiesUrl(`${id}ifyoudriveatruckdriveitlikeyouhaveafarm`)
  }, [id])

  const avatar = useMemo(
    () => <Avatar src={profileImage} size={avatarSize} borderRadius='lg' />,
    [profileImage, avatarSize],
  )
  const handleClick = useCallback(() => {
    onClick && onClick(wallet)
  }, [onClick, wallet])

  const handleRename = useCallback(() => onRename && onRename(wallet), [onRename, wallet])
  const handleDelete = useCallback(() => onDelete && onDelete(wallet), [onDelete, wallet])

  const rightElement = useMemo(() => {
    if (isInitializing) {
      return initializingIcon
    }

    if (isEditing) {
      return (
        <Flex ml='auto'>
          <IconButton
            as='a'
            aria-label={translate('common.rename')}
            variant='ghost'
            icon={editIcon}
            onClick={handleRename}
          />
          <IconButton
            as='a'
            aria-label={translate('common.forget')}
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
  }, [handleDelete, handleRename, isActive, isEditing, isInitializing, translate])
  return (
    <Button
      onClick={isDisabled ? undefined : handleClick}
      height='auto'
      p={4}
      leftIcon={avatar}
      justifyContent='flex-start'
      colorScheme='gray'
      _active={_active}
      _hover={_hover}
      {...buttonProps}
    >
      <Box
        as='span'
        textAlign='left'
        flex={1}
        overflow='hidden'
        whiteSpace='nowrap'
        textOverflow='ellipsis'
      >
        {wallet.label}
      </Box>
      {rightElement}
    </Button>
  )
}

import { CheckCircleIcon } from '@chakra-ui/icons'
import { Avatar, Button } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'

const activeIcon = <CheckCircleIcon color='blue.500' ml='auto' />

type WalletCardProps = {
  id?: string
  wallet: RevocableWallet
  onClick: (arg: RevocableWallet) => void
  isActive?: boolean
}

export const WalletCard: React.FC<WalletCardProps> = ({ id, wallet, onClick, isActive }) => {
  const profileImage = useMemo(() => {
    if (!id) return ''
    return makeBlockiesUrl(`${id}ifyoudriveatruckdriveitlikeyouhaveafarm`)
  }, [id])
  const avatar = useMemo(
    () => <Avatar src={profileImage} size='md' borderRadius='lg' />,
    [profileImage],
  )
  const handleClick = useCallback(() => {
    onClick(wallet)
  }, [onClick, wallet])
  return (
    <Button
      onClick={handleClick}
      height='auto'
      p={4}
      leftIcon={avatar}
      justifyContent='flex-start'
      {...(isActive && { rightIcon: activeIcon })}
    >
      {wallet.label}
    </Button>
  )
}

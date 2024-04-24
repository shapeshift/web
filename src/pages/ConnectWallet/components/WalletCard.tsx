import { Avatar, Button } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'

type WalletCardProps = {
  id?: string
  wallet: RevocableWallet
  onClick: (arg: RevocableWallet) => void
}

export const WalletCard: React.FC<WalletCardProps> = ({ id, wallet, onClick }) => {
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
    <Button onClick={handleClick} height='auto' p={4} leftIcon={avatar} justifyContent='flex-start'>
      {wallet.label}
    </Button>
  )
}

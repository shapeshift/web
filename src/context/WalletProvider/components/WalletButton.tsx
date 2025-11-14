import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, IconButton } from '@chakra-ui/react'
import { useMemo } from 'react'

type WalletButtonProps = {
  name: string
  icon?: AvatarProps['icon']
  src?: AvatarProps['src']
}

export const WalletButton = ({ name, icon, src }: WalletButtonProps) => {
  const after = useMemo(() => {
    return { content: `"${name}"`, inset: 0, fontSize: 'xs' }
  }, [name])

  const WalletIcon = useMemo(() => {
    return (
      <Avatar
        bg='white'
        size='xl'
        fontSize='65px'
        borderRadius='xl'
        borderEndRadius='xl'
        icon={icon}
        src={src}
      />
    )
  }, [icon, src])

  return (
    <IconButton
      variant='ghost'
      flexDir='column'
      height='auto'
      gap={2}
      icon={WalletIcon}
      aria-label='close dialog'
      _after={after}
    />
  )
}

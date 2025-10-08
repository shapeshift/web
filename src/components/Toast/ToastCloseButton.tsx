import { CloseIcon } from '@chakra-ui/icons'
import type { IconButtonProps } from '@chakra-ui/react'
import { IconButton } from '@chakra-ui/react'
import { useCallback } from 'react'

type ToastCloseButtonProps = { onClose: () => void }

const closeIcon = <CloseIcon />

const position: IconButtonProps['position'] = { base: 'static', md: 'absolute' }

const transform: IconButtonProps['transform'] = { base: 'none', md: 'translate(20%, -20%)' }

export const ToastCloseButton: React.FC<ToastCloseButtonProps> = ({ onClose }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onClose()
    },
    [onClose],
  )
  return (
    <IconButton
      aria-label='Close'
      size='xs'
      onClick={handleClick}
      position={position}
      top={0}
      right={0}
      zIndex={1}
      bg='white'
      fontSize='8px'
      color='black'
      icon={closeIcon}
      borderRadius='full'
      transform={transform}
    />
  )
}

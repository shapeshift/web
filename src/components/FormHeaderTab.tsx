import { Button } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback } from 'react'

type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

export const FormHeaderTab: React.FC<FormHeaderTabProps> = ({
  index,
  onClick,
  isActive,
  children,
}) => {
  const handleClick = useCallback(() => {
    onClick(index)
  }, [index, onClick])
  return (
    <Button
      onClick={handleClick}
      isActive={isActive}
      variant='unstyled'
      color='text.subtle'
      _active={activeStyle}
    >
      {children}
    </Button>
  )
}

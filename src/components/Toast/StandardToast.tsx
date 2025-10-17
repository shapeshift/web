import { Alert, AlertDescription, AlertIcon, AlertTitle, Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useCallback } from 'react'

import { ToastCloseButton } from './ToastCloseButton'

export type StandardToastProps = {
  icon?: ReactNode
  title: string | ReactNode
  description?: string | ReactNode
  onClick?: () => void
  onClose: () => void
  status?: 'success' | 'error' | 'warning' | 'info'
}

const hoverProps = {
  transform: 'translateY(-2px)',
}

export const StandardToast = ({
  icon,
  title,
  description,
  onClick,
  onClose,
  status,
}: StandardToastProps) => {
  const handleClick = onClick ?? (() => {})

  // Use standard surface background for info and non-status toasts, undefined (default) for others
  const bg = !status || status === 'info' ? 'background.surface.overlay.base' : undefined

  // Use solid variant for error/warning/success, subtle (default) for info and non-status
  const variant = status && status !== 'info' ? 'solid' : 'subtle'

  // Determine which icon to show
  const showIcon = icon || status

  // Memoize custom icon component
  const CustomIconComponent = useCallback(() => icon, [icon])

  return (
    <Box
      onClick={handleClick}
      cursor='pointer'
      position='relative'
      _hover={hoverProps}
      transition='all 0.2s'
    >
      <Alert
        status={status}
        borderRadius='20'
        boxShadow='lg'
        bg={bg}
        p={4}
        pr={8}
        gap={2}
        overflow='visible'
        variant={variant}
      >
        {showIcon && (icon ? <AlertIcon as={CustomIconComponent} /> : <AlertIcon />)}

        <Box flex='1'>
          {typeof title === 'string' ? <AlertTitle>{title}</AlertTitle> : <Box>{title}</Box>}

          {description &&
            (typeof description === 'string' ? (
              <AlertDescription>{description}</AlertDescription>
            ) : (
              <Box>{description}</Box>
            ))}
        </Box>

        <ToastCloseButton onClose={onClose} />
      </Alert>
    </Box>
  )
}

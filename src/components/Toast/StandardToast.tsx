import { Box, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { ToastWrapper } from './ToastWrapper'

import { RawText } from '@/components/Text'

export type StandardToastProps = {
  icon?: ReactNode
  title: string | ReactNode
  description?: string | ReactNode
  onClick?: () => void
  onClose: () => void
  status?: 'success' | 'error' | 'warning' | 'info'
}

type ToastContentProps = {
  children: string | ReactNode
}

const ToastTitle = ({ children }: ToastContentProps) => {
  if (typeof children === 'string') {
    return (
      <RawText fontSize='sm' letterSpacing='0.02em' fontWeight='semibold'>
        {children}
      </RawText>
    )
  }
  return <>{children}</>
}

const ToastDescription = ({ children }: ToastContentProps) => {
  if (typeof children === 'string') {
    return (
      <RawText fontSize='xs' mt={1} opacity={0.9}>
        {children}
      </RawText>
    )
  }
  return <Box mt={1}>{children}</Box>
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

  const statusBgColors = useColorModeValue(
    {
      error: 'red.500',
      success: 'green.500',
      warning: 'orange.500',
      info: 'blue.500',
    },
    {
      error: 'red.600',
      success: 'green.600',
      warning: 'orange.600',
      info: 'blue.600',
    },
  )

  const bg = useMemo(() => (status ? statusBgColors[status] : undefined), [status, statusBgColors])

  return (
    <ToastWrapper handleClick={handleClick} onClose={onClose} bg={bg}>
      <Flex alignItems='center' justifyContent='space-between' pe={6} width='100%'>
        <HStack spacing={2} flex={1}>
          {icon}
          <Box flex={1}>
            <ToastTitle>{title}</ToastTitle>
            {description && <ToastDescription>{description}</ToastDescription>}
          </Box>
        </HStack>
      </Flex>
    </ToastWrapper>
  )
}

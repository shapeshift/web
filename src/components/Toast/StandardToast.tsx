import { Box, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'

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

export const StandardToast = ({
  icon,
  title,
  description,
  onClick,
  onClose,
  status,
}: StandardToastProps) => {
  const handleClick = onClick ?? (() => {})

  const errorBg = useColorModeValue('red.500', 'red.600')
  const successBg = useColorModeValue('green.500', 'green.600')
  const warningBg = useColorModeValue('orange.500', 'orange.600')
  const infoBg = useColorModeValue('blue.500', 'blue.600')

  const bg = (() => {
    switch (status) {
      case 'error':
        return errorBg
      case 'success':
        return successBg
      case 'warning':
        return warningBg
      case 'info':
        return infoBg
      default:
        return undefined
    }
  })()

  return (
    <ToastWrapper handleClick={handleClick} onClose={onClose} bg={bg}>
      <Flex alignItems='center' justifyContent='space-between' pe={6} width='100%'>
        <HStack spacing={2} flex={1}>
          {icon && <Box flexShrink={0}>{icon}</Box>}
          <Box ml={icon ? 2 : 0} flex={1}>
            {typeof title === 'string' ? (
              <RawText fontSize='sm' letterSpacing='0.02em' fontWeight='semibold'>
                {title}
              </RawText>
            ) : (
              title
            )}
            {description &&
              (typeof description === 'string' ? (
                <RawText fontSize='xs' mt={1} opacity={0.9}>
                  {description}
                </RawText>
              ) : (
                <Box mt={1}>{description}</Box>
              ))}
          </Box>
        </HStack>
      </Flex>
    </ToastWrapper>
  )
}

import { Box, Button, Center, Heading, Stack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { FaSadTear } from 'react-icons/fa'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'

export type ErrorFallbackSize = 'sm' | 'md' | 'lg'

type ErrorFallbackProps = {
  icon?: ReactNode
  title: string
  body: string
  retryLabel: string
  onRetry: () => void
  size?: ErrorFallbackSize
}

const sizeConfig = {
  sm: {
    containerPadding: 6,
    stackSpacing: 3,
    iconSize: '8',
    iconFontSize: 'xl',
    headingSize: 'sm',
    textSize: 'sm',
    buttonSize: 'xs',
    maxWidth: 'sm',
  },
  md: {
    containerPadding: 6,
    stackSpacing: 3,
    iconSize: '10',
    iconFontSize: '2xl',
    headingSize: 'sm',
    textSize: 'sm',
    buttonSize: 'sm',
    maxWidth: 'md',
  },
  lg: {
    containerPadding: 8,
    stackSpacing: 4,
    iconSize: '12',
    iconFontSize: '3xl',
    headingSize: 'md',
    textSize: 'sm',
    buttonSize: 'sm',
    maxWidth: undefined,
  },
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  icon,
  title,
  body,
  retryLabel,
  onRetry,
  size = 'md',
}) => {
  const config = sizeConfig[size]

  return (
    <Center p={size === 'lg' ? 6 : 4}>
      <Box
        p={config.containerPadding}
        borderRadius='xl'
        bg='background.surface.raised.base'
        border='1px'
        borderColor='border.base'
        maxW={config.maxWidth}
      >
        <Stack spacing={config.stackSpacing} align='center' textAlign='center'>
          <IconCircle
            fontSize={config.iconFontSize}
            boxSize={config.iconSize}
            bg={icon ? 'border.base' : 'blue.500'}
            color={icon ? 'text.subtle' : 'white'}
          >
            {icon || <FaSadTear />}
          </IconCircle>
          <Heading size={config.headingSize} lineHeight='shorter' color='text.base'>
            {title}
          </Heading>
          <RawText fontSize={config.textSize} color='text.subtle'>
            {body}
          </RawText>
          <Button size={config.buttonSize} colorScheme='blue' onClick={onRetry}>
            {retryLabel}
          </Button>
        </Stack>
      </Box>
    </Center>
  )
}

import { Box, Button, Center, Heading, Stack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { FaSadTear } from 'react-icons/fa'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'

export type ErrorFallbackSize = 'sm' | 'md' | 'lg' | 'page'

type ErrorFallbackProps = {
  icon?: ReactNode
  title: string
  body: string
  retryLabel: string
  onRetry: () => void
  size?: ErrorFallbackSize
  height?: string | number
  showOverlay?: boolean
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
  page: {
    containerPadding: 8,
    stackSpacing: 4,
    iconSize: '20',
    iconFontSize: '4xl',
    headingSize: 'lg',
    textSize: 'md',
    buttonSize: 'md',
    maxWidth: 'lg',
  },
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  icon,
  title,
  body,
  retryLabel,
  onRetry,
  size = 'md',
  height,
  showOverlay = false,
}) => {
  const config = sizeConfig[size]
  const isPage = size === 'page'
  const isChart = showOverlay

  const centerProps = {
    ...(isPage && { minH: '100vh', px: 4 }),
    ...(isChart && {
      h: height,
      borderRadius: 'lg',
      bg: 'background.surface.raised.base',
      position: 'relative' as const,
      overflow: 'hidden',
      p: 4,
    }),
    ...(!isPage && !isChart && { p: size === 'lg' ? 6 : 4 }),
  }

  const containerProps = {
    p: config.containerPadding,
    borderRadius: 'xl',
    bg: 'background.surface.raised.base',
    border: '1px',
    borderColor: 'border.base',
    ...(config.maxWidth && { maxW: config.maxWidth }),
    ...(isPage && { w: 'full' }),
  }

  return (
    <Center {...centerProps}>
      {showOverlay && (
        <Box
          position='absolute'
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg='background.surface.overlay.base'
          opacity={0.3}
          pointerEvents='none'
        />
      )}
      {!isChart ? (
        <Box {...containerProps}>
          <Stack spacing={config.stackSpacing} align='center' textAlign='center'>
            <IconCircle
              fontSize={config.iconFontSize}
              boxSize={config.iconSize}
              bg={icon ? 'border.base' : 'blue.500'}
              color={icon ? 'text.subtle' : 'white'}
            >
              {icon || <FaSadTear />}
            </IconCircle>
            {renderContent()}
          </Stack>
        </Box>
      ) : (
        <Stack spacing={config.stackSpacing} align='center' textAlign='center'>
          <IconCircle
            fontSize={config.iconFontSize}
            boxSize={config.iconSize}
            bg='border.base'
            color='text.subtle'
          >
            {icon || <FaSadTear />}
          </IconCircle>
          {renderContent()}
        </Stack>
      )}
    </Center>
  )

  function renderContent() {
    return (
      <>
        {isPage ? (
          <Box>
            <Heading size={config.headingSize} lineHeight='shorter' color='text.base' mb={2}>
              {title}
            </Heading>
            <RawText fontSize={config.textSize} color='text.subtle'>
              {body}
            </RawText>
          </Box>
        ) : isChart ? (
          <Box>
            <RawText fontSize='md' fontWeight='semibold' color='text.base' mb={1}>
              {title}
            </RawText>
            <RawText fontSize={config.textSize} color='text.subtle'>
              {body}
            </RawText>
          </Box>
        ) : (
          <>
            <Heading size={config.headingSize} lineHeight='shorter' color='text.base'>
              {title}
            </Heading>
            <RawText fontSize={config.textSize} color='text.subtle'>
              {body}
            </RawText>
          </>
        )}
        <Button
          size={config.buttonSize}
          colorScheme='blue'
          onClick={onRetry}
          {...(isChart && { px: 6 })}
          {...(isPage && { px: 8 })}
        >
          {retryLabel}
        </Button>
      </>
    )
  }
}

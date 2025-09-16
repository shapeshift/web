import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { ButtonProps, FlexProps } from '@chakra-ui/react'
import { Box, Button, Circle, Flex, useColorModeValue } from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX, PropsWithChildren } from 'react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { DefiIcon } from '@/components/Icons/DeFi'
import { Text } from '@/components/Text'

export type ResultsEmptyProps = {
  icon?: JSX.Element
  title?: string | JSX.Element
  body?: string | [string, InterpolationOptions]
  ctaHref?: string | null
  ctaText?: string
  buttonProps?: ButtonProps
  containerProps?: FlexProps
  onCtaClick?: () => void
} & PropsWithChildren

const arrowForwardIcon = <ArrowForwardIcon />

export const ResultsEmpty: React.FC<ResultsEmptyProps> = ({
  icon = <DefiIcon boxSize='24px' color='purple.500' />,
  title = 'defi.noActivePositions',
  body = 'assets.assetCards.stakingBody',
  ctaHref,
  ctaText,
  buttonProps,
  containerProps,
  onCtaClick,
  children,
}) => {
  const bgColor = useColorModeValue('gray.100', 'gray.750')
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleCtaClick = useCallback(() => {
    if (ctaHref) {
      navigate(ctaHref)
    }
    onCtaClick?.()
  }, [ctaHref, navigate, onCtaClick])
  return (
    <Flex
      p={6}
      textAlign='center'
      alignItems='center'
      width='full'
      flexDir='column'
      gap={4}
      {...containerProps}
    >
      <Flex>
        <Circle bg={bgColor} size='40px'>
          {icon}
        </Circle>
      </Flex>
      <Flex alignItems='center' textAlign='center' flexDir='column' width='full' gap={2}>
        {typeof title === 'string' && (
          <Text fontWeight='bold' fontSize='lg' letterSpacing='0.02em' translation={title} />
        )}
        <Text color='text.subtle' letterSpacing='0.012em' translation={body} />
        {typeof title === 'object' && <Box mt={4}>{title}</Box>}
        {ctaText && (
          <Button
            colorScheme='purple'
            onClick={handleCtaClick}
            mt={4}
            rightIcon={arrowForwardIcon}
            {...buttonProps}
          >
            {translate(ctaText)}
          </Button>
        )}
        {children}
      </Flex>
    </Flex>
  )
}

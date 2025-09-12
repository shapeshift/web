import { Box, Card, CardHeader, Flex, Tooltip, useColorModeValue } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useMemo } from 'react'

const borderRadius = { base: 'md', md: 'lg' }
const hoverProps = {
  cursor: 'pointer',
  bg: 'background.surface.hover',
}

export type TradeQuoteCardProps = {
  icon: JSX.Element
  title?: string
  isActive: boolean
  isActionable: boolean
  headerContent: JSX.Element
  bodyContent: JSX.Element | null
  isDisabled: boolean
  onClick?: () => void
}

export const TradeQuoteCard = ({
  icon,
  title,
  isActive,
  isActionable,
  headerContent,
  bodyContent,
  isDisabled,
  onClick,
}: TradeQuoteCardProps) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const redColor = useColorModeValue('red.500', 'red.200')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')

  const activeSwapperColor = useMemo(() => {
    if (!isActionable) return redColor
    if (isActive) return 'border.focused'
    return borderColor
  }, [borderColor, isActionable, isActive, redColor])

  const activeProps = useMemo(
    () => ({ borderColor: isActive ? 'transparent' : focusColor }),
    [focusColor, isActive],
  )

  return (
    <Card
      borderWidth={2}
      boxShadow='none'
      bg={isActive ? 'background.surface.hover' : 'transparent'}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      borderColor={isActive ? activeSwapperColor : 'border.base'}
      _hover={isDisabled ? undefined : hoverProps}
      _active={isDisabled ? undefined : activeProps}
      borderRadius={borderRadius}
      size='sm'
      flexDir='column'
      width='full'
      fontSize='sm'
      onClick={isDisabled ? undefined : onClick}
      transitionProperty='common'
      transitionDuration='normal'
    >
      <CardHeader fontWeight='normal' fontSize='sm' pl={3} pr={4} pb={2}>
        <Flex alignItems='center' gap={2}>
          <Tooltip label={title}>
            <Box>{icon}</Box>
          </Tooltip>
          {headerContent}
        </Flex>
      </CardHeader>
      {bodyContent}
    </Card>
  )
}

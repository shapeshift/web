import { Box, Card, CardHeader, Flex, Text, Tooltip, useColorModeValue } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useMemo } from 'react'

const borderRadius = { base: 'md', md: 'xl' }
const hoverProps = {
  cursor: 'pointer',
  bg: 'background.button.secondary.hover',
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
  const redColor = useColorModeValue('red.500', 'red.500')

  const activeSwapperColor = useMemo(() => {
    if (!isActionable) return redColor
    if (isActive) return 'border.focused'
    return 'border.base'
  }, [isActionable, isActive, redColor])

  const activeProps = useMemo(
    () => ({ borderColor: isActive ? 'transparent' : 'border.focused' }),
    [isActive],
  )

  return (
    <Card
      borderWidth={1}
      bg={isActive ? 'background.surface.raised.base' : 'transparent'}
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
            <Flex alignItems='center' gap={2}>
              <Box>{icon}</Box>
              {title && (
                <Text fontSize='sm' fontWeight='medium'>
                  {title}
                </Text>
              )}
            </Flex>
          </Tooltip>
          {headerContent}
        </Flex>
      </CardHeader>
      {bodyContent}
    </Card>
  )
}

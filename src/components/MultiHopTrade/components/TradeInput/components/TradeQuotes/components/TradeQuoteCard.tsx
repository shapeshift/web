import { Card, CardHeader, Flex, useColorModeValue } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { RawText } from 'components/Text'

import { SwapperIcon } from '../../SwapperIcon/SwapperIcon'

const borderRadius = { base: 'md', md: 'lg' }
const hoverProps = {
  cursor: 'pointer',
  bg: 'background.surface.hover',
}

export type TradeQuoteCardProps = {
  title: string
  swapperName: SwapperName
  isActive: boolean
  isActionable: boolean
  headerContent: JSX.Element
  bodyContent: JSX.Element | null
  isDisabled: boolean
  onClick?: () => void
}

export const TradeQuoteCard = ({
  title,
  swapperName,
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
      <CardHeader fontWeight='normal' fontSize='sm' pl={3} pr={4}>
        <Flex justifyContent='space-between' alignItems='center'>
          <Flex
            gap={2}
            alignItems='center'
            overflow='hidden'
            textOverflow='ellipsis'
            whiteSpace='nowrap'
          >
            <SwapperIcon swapperName={swapperName} />
            <RawText fontWeight='medium' isTruncated>
              {title}
            </RawText>
          </Flex>
          {headerContent}
        </Flex>
      </CardHeader>
      {bodyContent}
    </Card>
  )
}

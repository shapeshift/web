import type { StackDirection } from '@chakra-ui/react'
import { Collapse, Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

const stackDivider = <StackDivider />

export const TransactionDetailsContainer = ({
  children,
  isOpen,
  compactMode,
}: {
  children: ReactNode
  isOpen: boolean
  compactMode: boolean
}) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

  const stackDirection: StackDirection = useMemo(
    () => ({ base: 'column', lg: compactMode ? 'column' : 'row' }),
    [compactMode],
  )

  const stackPaddingLeft = useMemo(() => ({ base: 4, lg: compactMode ? 4 : 6 }), [compactMode])
  const stackPaddingY = useMemo(() => ({ base: 4, lg: compactMode ? 4 : 0 }), [compactMode])
  const stackFontSize = useMemo(
    () => ({ base: 'sm', lg: compactMode ? 'sm' : 'md' }),
    [compactMode],
  )

  return (
    <Collapse in={isOpen} unmountOnExit>
      <Stack
        direction={stackDirection}
        spacing={4}
        divider={stackDivider}
        pl={stackPaddingLeft}
        pr={4}
        py={stackPaddingY}
        alignItems='flex-start'
        borderTopWidth={1}
        borderColor={borderColor}
        fontSize={stackFontSize}
      >
        {children}
      </Stack>
    </Collapse>
  )
}

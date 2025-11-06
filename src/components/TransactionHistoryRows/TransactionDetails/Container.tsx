import type { StackDirection } from '@chakra-ui/react'
import { Collapse, Stack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

export const TransactionDetailsContainer = ({
  children,
  isOpen,
  compactMode,
}: {
  children: ReactNode
  isOpen: boolean
  compactMode: boolean
}) => {
  const stackDirection: StackDirection = useMemo(
    () => ({ base: 'column', lg: compactMode ? 'column' : 'row' }),
    [compactMode],
  )

  const stackPaddingLeft = useMemo(() => ({ base: 4, lg: compactMode ? 4 : 6 }), [compactMode])
  const stackFontSize = useMemo(
    () => ({ base: 'sm', lg: compactMode ? 'sm' : 'md' }),
    [compactMode],
  )

  return (
    <Collapse in={isOpen} unmountOnExit>
      <Stack
        direction={stackDirection}
        spacing={6}
        pl={stackPaddingLeft}
        pr={4}
        alignItems='flex-start'
        fontSize={stackFontSize}
      >
        {children}
      </Stack>
    </Collapse>
  )
}

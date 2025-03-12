import type { TooltipProps } from '@chakra-ui/react'
import { Flex, Tooltip, useDisclosure } from '@chakra-ui/react'
import type { FC, ReactNode } from 'react'
import { useCallback } from 'react'

type HoverTooltipProps = Omit<TooltipProps, 'isOpen' | 'onClose' | 'children'> & {
  children: ReactNode
  label: ReactNode
}

export const HoverTooltip: FC<HoverTooltipProps> = ({ children, label, ...tooltipProps }) => {
  const disclosure = useDisclosure()

  const handleTooltipOpen = useCallback(() => {
    disclosure.onOpen()
  }, [disclosure])

  const handleTooltipClose = useCallback(() => {
    disclosure.onClose()
  }, [disclosure])

  return (
    <Tooltip
      {...tooltipProps}
      label={label}
      isOpen={disclosure.isOpen}
      onClose={handleTooltipClose}
    >
      <Flex
        onTouchStart={handleTooltipOpen}
        onTouchEnd={handleTooltipClose}
        onMouseEnter={handleTooltipOpen}
        onMouseLeave={handleTooltipClose}
      >
        {children}
      </Flex>
    </Tooltip>
  )
}

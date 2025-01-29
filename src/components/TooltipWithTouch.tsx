import type { TooltipProps } from '@chakra-ui/react'
import { Box, Tooltip } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useState } from 'react'

type TooltipWithTouchProps = Pick<TooltipProps, 'label'> & PropsWithChildren

export const TooltipWithTouch: React.FC<TooltipWithTouchProps> = ({ children, label }) => {
  const [isLabelOpen, setIsLabelOpen] = useState(false)

  const handleMouseEnter = useCallback(() => setIsLabelOpen(true), [])
  const handleMouseLeave = useCallback(() => setIsLabelOpen(false), [])
  const handleClick = useCallback(() => setIsLabelOpen(true), [])

  return (
    <Tooltip isOpen={isLabelOpen} label={label}>
      <Box onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleClick}>
        {children}
      </Box>
    </Tooltip>
  )
}

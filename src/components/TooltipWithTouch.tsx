import type { TooltipProps } from '@chakra-ui/react'
import { Box, Tooltip, useDisclosure, useMediaQuery } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

import { breakpoints } from '@/theme/theme'

export const TooltipWithTouch: React.FC<TooltipProps> = ({ children, label, ...otherProps }) => {
  const {
    isOpen: isTooltipOpen,
    onToggle: onTooltipToggle,
    onOpen: onTooltipOpen,
    onClose: onTooltipClose,
  } = useDisclosure()

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const boxRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const hasTouchMovedRef = useRef(false)

  // Click outside to close on mobile
  useEffect(() => {
    if (!isLargerThanMd && isTooltipOpen) {
      const handleTouchOutside = (event: TouchEvent) => {
        if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
          onTooltipClose()
        }
      }

      document.addEventListener('touchstart', handleTouchOutside)
      return () => {
        document.removeEventListener('touchstart', handleTouchOutside)
      }
    }
  }, [isTooltipOpen, isLargerThanMd, onTooltipClose])

  const handleToolTipOpen = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onTooltipOpen()
    },
    [onTooltipOpen],
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null
    hasTouchMovedRef.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current
    const touch = e.touches[0]
    if (start && touch && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10)
      hasTouchMovedRef.current = true
  }, [])

  const handleTooltipToggle = useCallback(
    (e: React.TouchEvent) => {
      // A touch that moved was a scroll, not a tap
      if (hasTouchMovedRef.current) return

      e.preventDefault()
      onTooltipToggle()
    },
    [onTooltipToggle],
  )

  const { onClose: onCallerClose } = otherProps
  const handleClose = useCallback(() => {
    onCallerClose?.()
    onTooltipClose()
  }, [onCallerClose, onTooltipClose])

  const handleTooltipClose = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onTooltipClose()
    },
    [onTooltipClose],
  )

  return (
    <Box
      {...otherProps}
      ref={boxRef}
      display='inline-flex'
      alignItems='center'
      onMouseEnter={isLargerThanMd ? handleToolTipOpen : undefined}
      onMouseLeave={isLargerThanMd ? handleTooltipClose : undefined}
      onFocus={isLargerThanMd ? onTooltipOpen : undefined}
      onBlur={isLargerThanMd ? onTooltipClose : undefined}
      onTouchStart={label !== undefined ? handleTouchStart : undefined}
      onTouchMove={label !== undefined ? handleTouchMove : undefined}
      onTouchEnd={label !== undefined ? handleTooltipToggle : undefined} // Don't rug the user with a preventDefault if there's no label
    >
      <Tooltip
        isOpen={isTooltipOpen}
        label={label}
        {...otherProps}
        // Chakra closes on pointerleave, which fires right after a touch ends, so only desktop gets it (for Escape)
        onClose={isLargerThanMd ? handleClose : onCallerClose}
      >
        {children}
      </Tooltip>
    </Box>
  )
}

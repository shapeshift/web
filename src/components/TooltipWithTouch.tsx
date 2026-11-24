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
  const lastPointerTypeRef = useRef<string | undefined>(undefined)

  // Tap outside or Escape closes, whatever the viewport width or the input that opened it
  useEffect(() => {
    if (!isTooltipOpen) return

    const handleTouchOutside = (event: TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        onTooltipClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onTooltipClose()
    }

    document.addEventListener('touchstart', handleTouchOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('touchstart', handleTouchOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isTooltipOpen, onTooltipClose])

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
    // Chakra also closes on pointerleave, which a touch fires right after lifting; touch closes via toggle/outside tap/Escape
    if (lastPointerTypeRef.current === 'touch') return
    onTooltipClose()
  }, [onCallerClose, onTooltipClose])

  const handlePointerType = useCallback((e: React.PointerEvent) => {
    lastPointerTypeRef.current = e.pointerType
  }, [])

  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      // Keyboard focus only; a tap can also focus the trigger and would fight the touch toggle
      if (e.target.matches(':focus-visible')) onTooltipOpen()
    },
    [onTooltipOpen],
  )

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
      onPointerEnter={handlePointerType}
      onPointerDown={handlePointerType}
      onFocus={handleFocus}
      onBlur={onTooltipClose}
      onTouchStart={label !== undefined ? handleTouchStart : undefined}
      onTouchMove={label !== undefined ? handleTouchMove : undefined}
      onTouchEnd={label !== undefined ? handleTooltipToggle : undefined} // Don't rug the user with a preventDefault if there's no label
    >
      <Tooltip isOpen={isTooltipOpen} label={label} {...otherProps} onClose={handleClose}>
        {children}
      </Tooltip>
    </Box>
  )
}

import type { TooltipProps } from '@chakra-ui/react'
import { Box, Tooltip, useDisclosure, useMediaQuery } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

import { breakpoints } from '@/theme/theme'

const isKeyboardFocus = (target: Element, lastPointerType: string | undefined) => {
  try {
    return target.matches(':focus-visible')
  } catch {
    // :focus-visible is unsupported before Firefox 85 and Safari 15.4
    return lastPointerType === undefined || lastPointerType === 'mouse'
  }
}

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

  useEffect(() => {
    if (!isTooltipOpen) return

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        onTooltipClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onTooltipClose()
    }

    document.addEventListener('pointerdown', handlePointerDownOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside)
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
      if (e.cancelable) e.preventDefault()
      // A touch that moved was a scroll, not a tap
      if (!hasTouchMovedRef.current) onTooltipToggle()
    },
    [onTooltipToggle],
  )

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    lastPointerTypeRef.current = e.pointerType
  }, [])

  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      if (label !== undefined && isKeyboardFocus(e.target, lastPointerTypeRef.current))
        onTooltipOpen()
    },
    [label, onTooltipOpen],
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
      onPointerDown={handlePointerDown}
      onFocus={handleFocus}
      onBlur={onTooltipClose}
      onTouchStart={label !== undefined ? handleTouchStart : undefined}
      onTouchMove={label !== undefined ? handleTouchMove : undefined}
      onTouchEnd={label !== undefined ? handleTooltipToggle : undefined} // Don't rug the user with a preventDefault if there's no label
    >
      <Tooltip isOpen={isTooltipOpen} label={label} {...otherProps}>
        {children}
      </Tooltip>
    </Box>
  )
}

import { useCallback, useRef } from 'react'

export interface UseHoverIntentOptions {
  openDelay?: number
  closeDelay?: number
}

export interface UseHoverIntentReturn {
  handleMouseEnter: () => void
  handleMouseLeave: () => void
}

/**
 * A hook that provides hover intent functionality to prevent flickering in dropdown menus.
 * Adds configurable delays before opening and closing to filter out accidental hover events.
 *
 **/
export const useHoverIntent = (
  isOpen: boolean,
  onOpen: () => void,
  onClose: () => void,
  options: UseHoverIntentOptions = {},
): UseHoverIntentReturn => {
  const { openDelay = 100, closeDelay = 300 } = options

  const openTimerRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

  const clearTimer = useCallback((timerRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearTimer(closeTimerRef)

    if (!isOpen) {
      clearTimer(openTimerRef)
      openTimerRef.current = setTimeout(onOpen, openDelay)
    }
  }, [isOpen, onOpen, clearTimer, openDelay])

  const handleMouseLeave = useCallback(() => {
    clearTimer(openTimerRef)

    if (isOpen) {
      clearTimer(closeTimerRef)
      closeTimerRef.current = setTimeout(onClose, closeDelay)
    }
  }, [isOpen, onClose, clearTimer, closeDelay])

  return {
    handleMouseEnter,
    handleMouseLeave,
  }
}

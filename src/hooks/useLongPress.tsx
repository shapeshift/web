import type { SystemStyleObject } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  onPress?: () => void
  delay?: number
  threshold?: number
  enableStyles?: boolean
}

interface UseLongPressReturn {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
  onMouseLeave: (e: React.MouseEvent) => void
  sx?: SystemStyleObject
  'data-pressing'?: boolean
}

export function useLongPress({
  onLongPress,
  onPress,
  delay = 500,
  threshold = 10,
  enableStyles = true,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const [isPressing, setIsPressing] = useState(false)

  // Clear timer utility
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Start press handler
  const handleStart = useCallback(
    (x: number, y: number) => {
      isLongPressRef.current = false
      startPosRef.current = { x, y }
      setIsPressing(true)

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        // This only works on android but ios implementation is way more effort
        if ('vibrate' in navigator) {
          navigator.vibrate(50) // 50ms vibration
        }
        onLongPress()
      }, delay)
    },
    [onLongPress, delay],
  )

  // End press handler
  const handleEnd = useCallback(() => {
    clearTimer()
    setIsPressing(false)

    // If timer didn't fire, it's a regular press
    if (!isLongPressRef.current && onPress) {
      onPress()
    }

    isLongPressRef.current = false
    startPosRef.current = null
  }, [clearTimer, onPress])

  // Move handler to check threshold
  const handleMove = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) return

      const deltaX = Math.abs(x - startPosRef.current.x)
      const deltaY = Math.abs(y - startPosRef.current.y)

      // If moved beyond threshold, cancel long press
      if (deltaX > threshold || deltaY > threshold) {
        clearTimer()
        setIsPressing(false)
        startPosRef.current = null
      }
    },
    [threshold, clearTimer],
  )

  // Touch event handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault() // Prevent text selection
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    },
    [handleStart],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handleEnd()
    },
    [handleEnd],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    },
    [handleMove],
  )

  // Mouse event handlers (for desktop testing)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY)
    },
    [handleStart],
  )

  const onMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      handleEnd()
    },
    [handleEnd],
  )

  const onMouseLeave = useCallback(
    (_e: React.MouseEvent) => {
      clearTimer()
      setIsPressing(false)
      startPosRef.current = null
    },
    [clearTimer],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  // Base styles for Chakra UI
  const styles: SystemStyleObject = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    touchAction: 'manipulation',
    cursor: 'pointer',
    transition: 'transform 0.15s ease-out',
    transform: isPressing ? 'scale(0.95)' : 'scale(1)',
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      backgroundColor: 'currentColor',
      opacity: 0,
      transition: 'opacity 0.3s ease-out',
      pointerEvents: 'none',
    },
    '&[data-pressing="true"]::after': {
      opacity: 0.1,
    },
  }

  const baseReturn: UseLongPressReturn = {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
  }

  if (enableStyles) {
    return {
      ...baseReturn,
      sx: styles,
      'data-pressing': isPressing,
    }
  }

  return baseReturn
}

// Example usage:
/*
import { Box } from '@chakra-ui/react';

function MyComponent() {
  const longPressProps = useLongPress({
    onLongPress: () => {
      console.log('Long pressed!');
      // Could trigger haptic feedback here
    },
    onPress: () => {
      console.log('Regular tap');
    },
    delay: 600,
    threshold: 15,
    enableStyles: true // Default is true
  });

  return (
    <Box
      {...longPressProps}
      bg="gray.100"
      p={6}
      borderRadius="md"
      textAlign="center"
    >
      Press and hold me
    </Box>
  );
}

// Or without styles (for custom styling):
function CustomStyledComponent() {
  const handlers = useLongPress({
    onLongPress: () => console.log('Long press!'),
    enableStyles: false
  });

  return (
    <div {...handlers} className="my-custom-styles">
      Custom styled element
    </div>
  );
}
*/

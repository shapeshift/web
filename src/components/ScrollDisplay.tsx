import { AnimatePresence } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import React, { useEffect, useState } from 'react'

import { FadeTransition } from './FadeTransition'

type ScrollDisplayProps = {
  threshold?: number // Threshold for when to switch displays, default to 72px
} & PropsWithChildren

type ScrollDisplayCompoundProps = {
  Default: React.FC<{ children: React.ReactNode }>
  OutOfView: React.FC<{ children: React.ReactNode }>
}

export const ScrollDisplay: React.FC<ScrollDisplayProps> & ScrollDisplayCompoundProps = ({
  threshold = 72,
  children,
}) => {
  const [showDefault, setShowDefault] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const isBelowThreshold = window.scrollY > threshold
      setShowDefault(!isBelowThreshold)
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [threshold])

  const defaultContent = React.Children.toArray(children).find(
    (child: any) => child.type === ScrollDisplay.Default,
  )
  const outOfViewContent = React.Children.toArray(children).find(
    (child: any) => child.type === ScrollDisplay.OutOfView,
  )

  return (
    <AnimatePresence mode='wait'>
      {showDefault ? (
        <FadeTransition key='default'>{defaultContent}</FadeTransition>
      ) : (
        <FadeTransition key='out-of-view'>{outOfViewContent}</FadeTransition>
      )}
    </AnimatePresence>
  )
}

// Default display component
ScrollDisplay.Default = ({ children }) => {
  return <>{children}</>
}

// Out of view display component
ScrollDisplay.OutOfView = ({ children }) => {
  return <>{children}</>
}

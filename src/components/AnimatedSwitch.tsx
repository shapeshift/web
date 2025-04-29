import { AnimatePresence } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import { Suspense } from 'react'

type AnimatedSwitchProps = PropsWithChildren

const suspenseFallback = <div>Loading...</div>

export const AnimatedSwitch: React.FC<PropsWithChildren<AnimatedSwitchProps>> = ({ children }) => {
  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>{children}</Suspense>
    </AnimatePresence>
  )
}

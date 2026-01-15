import type { Options } from 'canvas-confetti'
import { useCallback, useMemo, useRef } from 'react'
import type { TCanvasConfettiInstance } from 'react-canvas-confetti/dist/types'

export const useConfetti = () => {
  const refAnimationInstance = useRef<TCanvasConfettiInstance | null>(null)

  const getInstance = useCallback(({ confetti }: { confetti: TCanvasConfettiInstance }) => {
    refAnimationInstance.current = confetti
  }, [])

  const makeShot = useCallback((particleRatio: number, opts: Partial<Options>) => {
    if (refAnimationInstance.current) {
      refAnimationInstance.current({
        ...opts,
        origin: { y: 0.7 },
        particleCount: Math.floor(200 * particleRatio),
      })
    }
  }, [])

  const fireConfetti = useCallback(() => {
    makeShot(0.25, { spread: 26, startVelocity: 55 })
    makeShot(0.2, { spread: 60 })
    makeShot(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    makeShot(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    makeShot(0.1, { spread: 120, startVelocity: 45 })
  }, [makeShot])

  const confettiStyle = useMemo(
    () => ({
      position: 'fixed' as const,
      pointerEvents: 'none' as const,
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      zIndex: 9999,
    }),
    [],
  )

  return { getInstance, fireConfetti, confettiStyle }
}

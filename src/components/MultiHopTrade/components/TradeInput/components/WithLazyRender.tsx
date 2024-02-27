import { useEffect, useRef } from 'react'

export type WithLazyRenderProps = { shouldUse: boolean; component: React.FC }

/**
 * Higher-order component that avoids rendering a component passed via props until `shouldUse` is
 * true. Used to mount hooks lazily where their initialization cost is non-trivial. `Component` is
 * an otherwise empty component containing the expensive initialization.
 */
export const WithLazyRender = ({ shouldUse, component: Component }: WithLazyRenderProps) => {
  const persistentShouldUse = useRef(false)

  useEffect(() => {
    if (!shouldUse || persistentShouldUse.current === true) {
      return
    }

    persistentShouldUse.current = shouldUse
  }, [shouldUse])

  if (!persistentShouldUse.current) return null

  return <Component />
}

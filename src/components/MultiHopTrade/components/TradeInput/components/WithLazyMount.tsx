import { useEffect, useMemo, useRef } from 'react'

export type WithLazyRenderProps<T = {}> = { shouldUse: boolean; component: React.FC<T> } & T

/**
 * Higher-order component that avoids rendering a component passed via props until `shouldUse` is
 * true. Used to mount hooks lazily where their initialization cost is non-trivial. `Component` is
 * an otherwise empty component containing the expensive initialization.
 */
export const WithLazyMount = <T extends object>(props: WithLazyRenderProps<T>) => {
  const persistentShouldUse = useRef(false)
  const {
    shouldUse,
    component: Component,
    componentProps,
  } = useMemo(() => {
    const { shouldUse, component, ...componentProps } = props

    return {
      shouldUse,
      component,
      componentProps,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))

  useEffect(() => {
    persistentShouldUse.current = shouldUse
  }, [shouldUse])

  if (!persistentShouldUse.current) return null

  return <Component {...(componentProps as T)} />
}

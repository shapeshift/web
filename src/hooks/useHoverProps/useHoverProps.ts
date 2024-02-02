import { useState } from 'react'

export function useHoverProps() {
  const [hover, setHover] = useState(false)

  const hoverProps = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  }

  return [hover, hoverProps]
}

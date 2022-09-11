import type { PropsWithChildren } from 'react'
import { SlideTransition } from 'components/SlideTransition'

export const SubMenuContainer: React.FC<PropsWithChildren> = ({ children }) => {
  return <SlideTransition>{children}</SlideTransition>
}
